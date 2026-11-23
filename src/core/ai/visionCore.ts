import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  GestureRecognizer,
  GestureRecognizerResult,
} from '@mediapipe/tasks-vision'
import type { VisionConfig } from '@/config/gestures'
import type {
  Delegate,
  RawFace,
  RawHand,
  RawResult,
  VisionErrorCode,
} from './protocol'

export class VisionError extends Error {
  constructor(
    public code: VisionErrorCode,
    message: string,
  ) {
    super(message)
  }
}

async function fetchWithProgress(
  url: string,
  onBytes: (loaded: number, total: number) => void,
): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(url)
  } catch (e) {
    throw new VisionError('model-fetch', String(e))
  }
  if (!response.ok || !response.body)
    throw new VisionError('model-fetch', url + ' -> ' + response.status)
  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onBytes(loaded, total)
  }
  const out = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function packLandmarks(points: { x: number; y: number }[]): Float32Array {
  const out = new Float32Array(points.length * 2)
  for (let i = 0; i < points.length; i++) {
    out[i * 2] = points[i]!.x
    out[i * 2 + 1] = points[i]!.y
  }
  return out
}

function packHands(r: GestureRecognizerResult): RawHand[] {
  return r.landmarks.map((points, i) => ({
    landmarks: packLandmarks(points),
    handedness: r.handedness[i]?.[0]?.categoryName ?? 'Right',
    gestures: (r.gestures[i] ?? []).map((c) => ({
      name: c.categoryName,
      score: c.score,
    })),
  }))
}

function packFaces(r: FaceLandmarkerResult): RawFace[] {
  return r.faceLandmarks.map((points, i) => {
    const matrix = r.facialTransformationMatrixes[i]
    return {
      landmarks: packLandmarks(points),
      blendshapes: (r.faceBlendshapes[i]?.categories ?? []).map((c) => ({
        name: c.categoryName,
        score: c.score,
      })),
      transform: matrix ? Float32Array.from(matrix.data) : undefined,
    }
  })
}

/**
 * Model host shared by the worker and the main-thread fallback.
 * Runs gesture on even ticks and face on odd ticks unless `runBoth` is set.
 */
export class VisionCore {
  private gesture?: GestureRecognizer
  private face?: FaceLandmarker
  private tick = 0
  private lastTs = -1
  runBoth = false
  delegate: Delegate = 'GPU'

  async init(
    config: VisionConfig,
    delegate: Delegate,
    origin: string,
    onProgress: (percent: number) => void,
  ): Promise<Delegate> {
    const vision = await import('@mediapipe/tasks-vision').catch(
      (e: unknown) => {
        throw new VisionError('wasm-load', String(e))
      },
    )
    const abs = (p: string) => new URL(p, origin).toString()
    const inWorker =
      typeof (globalThis as { WorkerGlobalScope?: unknown })
        .WorkerGlobalScope !== 'undefined'
    let fileset: Awaited<
      ReturnType<typeof vision.FilesetResolver.forVisionTasks>
    >
    try {
      // Module workers cannot importScripts, so they load the ES module build.
      fileset = await vision.FilesetResolver.forVisionTasks(
        abs(config.wasmBase),
        inWorker,
      )
    } catch (e) {
      throw new VisionError('wasm-load', String(e))
    }
    const loaded = [0, 0]
    const totals = [8_400_000, 3_800_000]
    const report = (i: number) => (bytes: number, total: number) => {
      loaded[i] = bytes
      if (total) totals[i] = total
      const sum = (loaded[0]! + loaded[1]!) / (totals[0]! + totals[1]!)
      onProgress(Math.min(90, Math.round(sum * 90)))
    }
    const [gestureBuf, faceBuf] = await Promise.all([
      fetchWithProgress(abs(config.gestureModel), report(0)),
      fetchWithProgress(abs(config.faceModel), report(1)),
    ])
    // MediaPipe clears `self.ModuleFactory` after instantiating WASM, and a
    // repeated dynamic import() of the loader is served from the module cache
    // without re-running it. In module workers we therefore import the loader
    // once and restore the factory before every task creation.
    type FactoryScope = { ModuleFactory?: unknown }
    let factory: unknown
    if (inWorker) {
      try {
        const loader = (await import(
          /* @vite-ignore */ fileset.wasmLoaderPath
        )) as { default?: unknown }
        factory = loader.default ?? (globalThis as FactoryScope).ModuleFactory
      } catch (e) {
        throw new VisionError('wasm-load', String(e))
      }
    }
    const restoreFactory = () => {
      if (factory) (globalThis as FactoryScope).ModuleFactory = factory
    }
    const create = async (d: Delegate) => {
      this.dispose()
      restoreFactory()
      this.gesture = await vision.GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: gestureBuf, delegate: d },
        runningMode: 'VIDEO',
        numHands: config.numHands,
        minHandDetectionConfidence: config.minHandDetectionConfidence,
        minHandPresenceConfidence: config.minHandPresenceConfidence,
        minTrackingConfidence: config.minTrackingConfidence,
      })
      onProgress(95)
      restoreFactory()
      this.face = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: faceBuf, delegate: d },
        runningMode: 'VIDEO',
        numFaces: config.numFaces,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      })
    }
    try {
      await create(delegate)
      this.delegate = delegate
    } catch (first) {
      console.warn('[vision] ' + delegate + ' init failed', first)
      if (delegate === 'CPU') throw new VisionError('model-init', String(first))
      try {
        await create('CPU')
        this.delegate = 'CPU'
      } catch (e) {
        throw new VisionError('model-init', String(e))
      }
    }
    onProgress(100)
    return this.delegate
  }

  async setNumFaces(numFaces: number): Promise<void> {
    await this.face?.setOptions({ numFaces })
  }

  process(frame: TexImageSource, ts: number): RawResult {
    if (!this.gesture || !this.face)
      throw new VisionError('inference', 'not initialised')
    // MediaPipe requires strictly increasing timestamps.
    const t = ts <= this.lastTs ? this.lastTs + 1 : ts
    this.lastTs = t
    const start = performance.now()
    const result: RawResult = { ts, inferenceMs: 0 }
    const even = this.tick++ % 2 === 0
    if (this.runBoth || even)
      result.hands = packHands(this.gesture.recognizeForVideo(frame, t))
    if (this.runBoth || !even)
      result.faces = packFaces(this.face.detectForVideo(frame, t))
    result.inferenceMs = performance.now() - start
    return result
  }

  dispose(): void {
    this.gesture?.close()
    this.face?.close()
    this.gesture = undefined
    this.face = undefined
  }
}
