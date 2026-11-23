import { visionConfig } from '@/config/gestures'
import { PerceptionTracker } from '@/core/ai/perception'
import type { Delegate } from '@/core/ai/protocol'
import { setMirror } from '@/core/ai/toDisplay'
import { VisionClient } from '@/core/ai/visionClient'
import { cameraErrorOf, openCamera, stopStream } from '@/core/camera'
import { vi } from '@/i18n/vi'
import { useSession } from '@/store/session'
import { useStage } from '@/store/stage'
import type { Vec2 } from '@/types'
import { CameraLayer } from './layers/cameraLayer'
import { FxLayer } from './layers/fxLayer'
import { HudLayer } from './layers/hudLayer'
import { RenderLoop } from './renderLoop'
import { createViewport, fromPixel, stageDpr, type Viewport } from './viewport'

export interface StageElements {
  root: HTMLElement
  video: HTMLVideoElement
  camera: HTMLCanvasElement
  fx: HTMLCanvasElement
  hud: HTMLCanvasElement
}

/**
 * Owns the render loop and everything that runs per frame. React only mounts
 * the elements and reads coarse status from the store (<= 10 Hz).
 */
export class StageEngine {
  private loop: RenderLoop
  private cameraLayer: CameraLayer
  private fxLayer: FxLayer
  private hudLayer: HudLayer
  private stream: MediaStream | null = null
  private vision?: VisionClient
  readonly tracker = new PerceptionTracker()
  private view: Viewport
  private dpr = 1
  private pointer: Vec2 | null = null
  private lastPublish = 0
  private loadTimer = 0
  private resizeObserver?: ResizeObserver
  private disposed = false

  constructor(private el: StageElements) {
    this.cameraLayer = new CameraLayer(el.camera)
    this.fxLayer = new FxLayer(el.fx)
    this.hudLayer = new HudLayer(el.hud)
    this.view = createViewport(1, 1, 16, 9)
    this.loop = new RenderLoop((now) => this.frame(now))
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(el.root)
    } else window.addEventListener('resize', this.onWindowResize)
    this.resize()
    el.root.addEventListener('pointermove', this.onPointer)
    el.root.addEventListener('pointerdown', this.onPointer)
    el.root.addEventListener('pointerleave', this.onPointerLeave)
    document.addEventListener('visibilitychange', this.onVisibility)
    useStage.getState().set({
      perf: {
        ...useStage.getState().perf,
        renderer: this.cameraLayer.renderer,
      },
    })
    this.loop.start()
  }

  private onPointer = (e: PointerEvent) => {
    const rect = this.el.root.getBoundingClientRect()
    this.pointer = fromPixel(
      this.view,
      e.clientX - rect.left,
      e.clientY - rect.top,
      this.pointer ?? { x: 0, y: 0 },
    )
  }
  private onWindowResize = () => this.resize()
  private onPointerLeave = () => {
    this.pointer = null
  }
  private onVisibility = () => {
    this.vision?.setPaused(document.hidden)
  }

  private resize(): void {
    const rect = this.el.root.getBoundingClientRect()
    this.dpr = stageDpr()
    const w = Math.max(1, Math.round(rect.width * this.dpr))
    const h = Math.max(1, Math.round(rect.height * this.dpr))
    this.cameraLayer.resize(w, h)
    this.fxLayer.resize(w, h)
    this.hudLayer.resize(w, h)
    this.updateView(rect.width, rect.height)
  }

  private updateView(width: number, height: number): void {
    const v = this.el.video
    this.view = createViewport(
      width,
      height,
      v.videoWidth || 1280,
      v.videoHeight || 720,
    )
  }

  get viewport(): Viewport {
    return this.view
  }

  async startCamera(): Promise<void> {
    const set = useStage.getState().set
    set({ camera: 'requesting', cameraError: undefined })
    try {
      stopStream(this.stream)
      this.stream = await openCamera(this.el.video, () => {
        if (!this.disposed) set({ camera: 'ended' })
      })
      if (this.disposed) return stopStream(this.stream)
      this.el.video.onresize = () => this.resize()
      this.resize()
      set({ camera: 'live' })
      if (!this.vision) this.startVision()
    } catch (e) {
      if (!this.disposed)
        set({ camera: 'error', cameraError: cameraErrorOf(e) })
    }
  }

  /** Mouse/touch mode: no camera, no AI. */
  useWithoutCamera(): void {
    stopStream(this.stream)
    this.stream = null
    this.el.video.srcObject = null
    this.stopVision()
    useStage.getState().set({ camera: 'off', vision: 'off' })
  }

  startVision(delegate: Delegate = 'GPU', forceMain = false): void {
    this.stopVision()
    const set = useStage.getState().set
    set({
      vision: 'loading',
      progress: 0,
      slowLoad: false,
      visionError: undefined,
    })
    window.clearTimeout(this.loadTimer)
    this.loadTimer = window.setTimeout(() => {
      if (useStage.getState().vision === 'loading') set({ slowLoad: true })
    }, visionConfig.loadTimeoutMs)
    const client = new VisionClient({
      onProgress: (progress) => set({ progress }),
      onReady: () => {
        window.clearTimeout(this.loadTimer)
        set({ vision: 'ready', progress: 100, slowLoad: false })
      },
      onResult: (result) => this.tracker.ingest(result),
      onError: (visionError, visionMessage) => {
        window.clearTimeout(this.loadTimer)
        console.error('[vision]', visionError, visionMessage)
        set({ vision: 'error', visionError, visionMessage })
      },
    })
    this.vision = client
    client.start(delegate, forceMain)
  }

  private stopVision(): void {
    this.vision?.dispose()
    this.vision = undefined
    this.tracker.reset()
  }

  setMirror(mirror: boolean): void {
    setMirror(mirror)
    this.cameraLayer.mirror = mirror
    this.tracker.reset()
  }

  private frame(now: number): void {
    const video = this.stream ? this.el.video : null
    if (
      video &&
      (video.videoWidth !== this.view.srcWidth ||
        video.videoHeight !== this.view.srcHeight) &&
      video.videoWidth
    )
      this.updateView(this.view.width, this.view.height)
    if (video) this.vision?.pump(video, now)
    const snapshot = this.tracker.sample(now)
    const debug = useSession.getState().debug
    this.cameraLayer.bloomEnabled = !this.loop.stats.degraded
    this.cameraLayer.draw(video, this.view, this.dpr, now)
    this.fxLayer.showTestLabel = debug
    this.fxLayer.draw(this.view, this.dpr, snapshot, vi.testLabel)
    this.hudLayer.draw(this.view, this.dpr, {
      snapshot,
      pointer: this.pointer,
      debug,
    })
    if (now - this.lastPublish > 100) {
      this.lastPublish = now
      this.publish(snapshot.hands.length, snapshot.faces.length)
    }
  }

  private publish(hands: number, faces: number): void {
    const stats = this.vision?.stats
    const snapshot = this.tracker.snapshot
    useStage.getState().set({
      perf: {
        fps: this.loop.stats.fps,
        p95: this.loop.stats.p95,
        inferenceFps: stats?.inferenceFps ?? 0,
        inferenceMs: stats?.inferenceMs ?? 0,
        runtime: stats?.runtime ?? 'off',
        delegate: stats?.delegate ?? '-',
        renderer: this.cameraLayer.renderer,
        runBoth: stats?.runBoth ?? false,
        hands,
        faces,
        handLabels: snapshot.hands.map((h) => h.handedness).join(', '),
      },
    })
  }

  dispose(): void {
    this.disposed = true
    window.clearTimeout(this.loadTimer)
    this.loop.stop()
    this.stopVision()
    stopStream(this.stream)
    this.stream = null
    this.resizeObserver?.disconnect()
    window.removeEventListener('resize', this.onWindowResize)
    this.el.root.removeEventListener('pointermove', this.onPointer)
    this.el.root.removeEventListener('pointerdown', this.onPointer)
    this.el.root.removeEventListener('pointerleave', this.onPointerLeave)
    document.removeEventListener('visibilitychange', this.onVisibility)
  }
}
