import { visionConfig, type VisionConfig } from '@/config/gestures'
import type {
  Delegate,
  FromWorker,
  RawResult,
  ToWorker,
  VisionErrorCode,
} from './protocol'
import type { VisionCore } from './visionCore'

export type VisionRuntime = 'worker' | 'main'

export interface VisionCallbacks {
  onProgress(percent: number): void
  onReady(info: { runtime: VisionRuntime; delegate: Delegate }): void
  onResult(result: RawResult): void
  onError(code: VisionErrorCode, message: string): void
}

export interface VisionStats {
  runtime: VisionRuntime | 'off'
  delegate: Delegate | '-'
  inferenceFps: number
  inferenceMs: number
  runBoth: boolean
}

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

/**
 * Main-thread side of perception: samples frames, enforces backpressure
 * (max one frame in flight), adapts model interleaving, and falls back to
 * running MediaPipe on the main thread if the worker cannot start.
 */
export class VisionClient {
  private worker?: Worker
  private mainCore?: VisionCore
  private inFlight = false
  private ready = false
  private disposed = false
  private lastSent = -Infinity
  private paused = false
  private liteMode = false
  private resultTimes: number[] = []
  private msAvg = 0
  private runBoth = false
  private readonly config: VisionConfig
  stats: VisionStats = {
    runtime: 'off',
    delegate: '-',
    inferenceFps: 0,
    inferenceMs: 0,
    runBoth: false,
  }

  constructor(
    private callbacks: VisionCallbacks,
    config: Partial<VisionConfig> = {},
  ) {
    this.config = { ...visionConfig, ...config }
  }

  get isReady(): boolean {
    return this.ready
  }

  private get targetFps(): number {
    if (this.stats.runtime === 'main') return this.config.fallbackFps
    if (this.liteMode) return 14
    return isMobile() ? this.config.mobileTargetFps : this.config.targetFps
  }

  start(delegate: Delegate = 'GPU', forceMain = false): void {
    const origin = location.href
    if (!forceMain && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./vision.worker.ts', import.meta.url),
          {
            type: 'module',
          },
        )
        this.worker.onmessage = (e: MessageEvent<FromWorker>) =>
          this.handle(e.data, delegate)
        this.worker.onerror = (e) => {
          e.preventDefault()
          if (!this.ready) this.fallbackToMain(delegate)
        }
        this.post({ type: 'init', config: this.config, delegate, origin })
        this.stats.runtime = 'worker'
        return
      } catch {
        this.worker = undefined
      }
    }
    this.fallbackToMain(delegate)
  }

  private fallbackToMain(delegate: Delegate): void {
    if (this.disposed) return
    this.worker?.terminate()
    this.worker = undefined
    this.inFlight = false
    this.stats.runtime = 'main'
    void import('./visionCore').then(async ({ VisionCore, VisionError }) => {
      const core = new VisionCore()
      try {
        const used = await core.init(
          this.config,
          delegate,
          location.href,
          this.callbacks.onProgress,
        )
        if (this.disposed) return core.dispose()
        this.mainCore = core
        this.ready = true
        this.stats.delegate = used
        this.callbacks.onReady({ runtime: 'main', delegate: used })
      } catch (e) {
        const code = e instanceof VisionError ? e.code : 'model-init'
        this.callbacks.onError(code, String(e))
      }
    })
  }

  private post(message: ToWorker, transfer: Transferable[] = []): void {
    this.worker?.postMessage(message, transfer)
  }

  private handle(msg: FromWorker, delegate: Delegate): void {
    if (this.disposed) return
    switch (msg.type) {
      case 'progress':
        this.callbacks.onProgress(msg.percent)
        break
      case 'ready':
        this.ready = true
        this.stats.delegate = msg.delegate
        this.callbacks.onReady({ runtime: 'worker', delegate: msg.delegate })
        break
      case 'result':
        this.inFlight = false
        this.accept(msg.result)
        break
      case 'error':
        this.inFlight = false
        // A worker that cannot load WASM may still work on the main thread.
        if (!this.ready && msg.code === 'wasm-load')
          this.fallbackToMain(delegate)
        else if (!this.ready || msg.code !== 'inference')
          this.callbacks.onError(msg.code, msg.message)
        break
    }
  }

  private accept(result: RawResult): void {
    const now = performance.now()
    this.resultTimes.push(now)
    while (this.resultTimes.length && now - this.resultTimes[0]! > 1000)
      this.resultTimes.shift()
    this.msAvg = this.msAvg
      ? this.msAvg * 0.9 + result.inferenceMs * 0.1
      : result.inferenceMs
    // Adaptive quality: run both models per tick when there is headroom (disabled in lite mode).
    const budget = this.config.bothModelsBudgetMs
    const wantBoth = this.liteMode
      ? false
      : this.runBoth
        ? this.msAvg < budget * 1.6
        : this.msAvg < budget * 0.6
    if (wantBoth !== this.runBoth) {
      this.runBoth = wantBoth
      if (this.mainCore) this.mainCore.runBoth = wantBoth
      else this.post({ type: 'setOptions', runBoth: wantBoth })
    }
    this.stats.inferenceFps = this.resultTimes.length
    this.stats.inferenceMs = this.msAvg
    this.stats.runBoth = this.runBoth
    this.callbacks.onResult(result)
  }

  setPaused(paused: boolean): void {
    this.paused = paused
  }

  setLiteMode(lite: boolean): void {
    this.liteMode = lite
    if (lite && this.runBoth) {
      this.runBoth = false
      if (this.mainCore) this.mainCore.runBoth = false
      else this.post({ type: 'setOptions', runBoth: false })
      this.stats.runBoth = false
    }
  }

  setNumFaces(numFaces: number): void {
    if (this.mainCore) void this.mainCore.setNumFaces(numFaces)
    else this.post({ type: 'setOptions', numFaces })
  }

  /** Called every render frame; sends a frame only when allowed. */
  pump(video: HTMLVideoElement, now: number): void {
    if (!this.ready || this.paused || this.inFlight) return
    if (video.readyState < 2 || video.videoWidth === 0) return
    if (now - this.lastSent < 1000 / this.targetFps - 2) return
    this.lastSent = now
    this.inFlight = true
    if (this.mainCore) {
      try {
        const result = this.mainCore.process(video, now)
        this.inFlight = false
        this.accept(result)
      } catch {
        this.inFlight = false
      }
      return
    }
    const long = this.liteMode
      ? Math.min(this.config.inferenceLongEdge, 384)
      : this.config.inferenceLongEdge
    const ratio = Math.min(
      1,
      long / Math.max(video.videoWidth, video.videoHeight),
    )
    createImageBitmap(video, {
      resizeWidth: Math.round(video.videoWidth * ratio),
      resizeHeight: Math.round(video.videoHeight * ratio),
      resizeQuality: 'low',
    })
      .then((bitmap) => {
        if (this.disposed || !this.worker) {
          bitmap.close()
          this.inFlight = false
          return
        }
        this.post({ type: 'frame', bitmap, ts: now }, [bitmap])
      })
      .catch(() => {
        this.inFlight = false
      })
  }

  dispose(): void {
    this.disposed = true
    this.ready = false
    this.post({ type: 'dispose' })
    const worker = this.worker
    // Let the worker free GPU resources before terminating it.
    setTimeout(() => worker?.terminate(), 200)
    this.worker = undefined
    this.mainCore?.dispose()
    this.mainCore = undefined
    this.stats.runtime = 'off'
  }
}
