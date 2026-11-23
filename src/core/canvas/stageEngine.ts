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
import { InteractionController } from '@/core/interaction/controller'
import { useScene } from '@/store/scene'
import { createComboState, stepCombo } from '@/core/ai/combo/engine'
import { DerivedTracker } from '@/core/ai/gestures/faceGestures'
import { MicAnalyser } from '@/core/audio/micAnalyser'
import { setMuted } from '@/core/audio/engine'
import { useFx } from '@/store/fx'
import { useMemes } from '@/store/memes'
import type { HandGestureId } from '@/types'
import { FxEngine } from './fx'
import { ArProps } from './props/arProps'
import { CameraLayer } from './layers/cameraLayer'
import { spaceFor } from './layers/creativeLayer'
import { CreativeLayer } from './layers/creativeLayer'
import { FxLayer } from './layers/fxLayer'
import { HudLayer } from './layers/hudLayer'
import { RenderLoop } from './renderLoop'
import { createViewport, fromPixel, stageDpr, type Viewport } from './viewport'

export interface StageElements {
  root: HTMLElement
  /** Wrapper of layers 0-2 (screen shake is applied here). */
  layers: HTMLElement
  video: HTMLVideoElement
  camera: HTMLCanvasElement
  creative: HTMLCanvasElement
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
  private creativeLayer: CreativeLayer
  private fxLayer: FxLayer
  readonly controller = new InteractionController()
  readonly derived = new DerivedTracker()
  readonly combo = createComboState()
  readonly fx = new FxEngine()
  readonly props = new ArProps()
  readonly mic = new MicAnalyser()
  private lastFrame = 0
  private pulse = 1
  private pulseV = 0
  private shakeApplied = false
  private comboScores: Record<string, number> = {}
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
    this.creativeLayer = new CreativeLayer(el.creative)
    this.fxLayer = new FxLayer(el.fx)
    this.hudLayer = new HudLayer(el.hud)
    this.view = createViewport(1, 1, 16, 9)
    this.loop = new RenderLoop((now) => this.frame(now))
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(el.root)
    } else window.addEventListener('resize', this.onWindowResize)
    this.resize()
    el.root.addEventListener('pointermove', this.onPointerMove)
    el.root.addEventListener('pointerdown', this.onPointerDown)
    el.root.addEventListener('pointerup', this.onPointerUp)
    el.root.addEventListener('pointercancel', this.onPointerUp)
    el.root.addEventListener('pointerleave', this.onPointerLeave)
    el.root.addEventListener('wheel', this.onWheel, { passive: false })
    document.addEventListener('visibilitychange', this.onVisibility)
    useStage.getState().set({
      perf: {
        ...useStage.getState().perf,
        renderer: this.cameraLayer.renderer,
      },
    })
    this.loop.start()
  }

  private toDisplayPoint(e: { clientX: number; clientY: number }): Vec2 {
    const rect = this.el.root.getBoundingClientRect()
    return fromPixel(this.view, e.clientX - rect.left, e.clientY - rect.top)
  }
  /** Only events on the stage surface itself (not overlay UI) edit the scene. */
  private isStageTarget(e: Event): boolean {
    const t = e.target as Element | null
    return !!t && (t === this.el.root || t.classList.contains('layer'))
  }
  private onPointerMove = (e: PointerEvent) => {
    const p = this.toDisplayPoint(e)
    this.pointer = e.pointerType === 'touch' ? null : p
    this.controller.pointerMove(e.pointerId, p, performance.now())
  }
  private onPointerDown = (e: PointerEvent) => {
    if (!this.isStageTarget(e) || e.button > 0) return
    const p = this.toDisplayPoint(e)
    this.pointer = e.pointerType === 'touch' ? null : p
    this.el.root.setPointerCapture?.(e.pointerId)
    this.controller.pointerDown(e.pointerId, p, performance.now())
  }
  private onPointerUp = (e: PointerEvent) => {
    this.controller.pointerUp(e.pointerId)
    if (e.pointerType === 'touch') this.pointer = null
  }
  private onWheel = (e: WheelEvent) => {
    if (!this.isStageTarget(e)) return
    if (this.controller.wheel(this.toDisplayPoint(e), e.deltaY, e.shiftKey))
      e.preventDefault()
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
    this.creativeLayer.resize(w, h)
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
    const dt = this.lastFrame
      ? Math.min(0.05, (now - this.lastFrame) / 1000)
      : 0.016
    this.lastFrame = now
    const video = this.stream ? this.el.video : null
    if (
      video &&
      (video.videoWidth !== this.view.srcWidth ||
        video.videoHeight !== this.view.srcHeight) &&
      video.videoWidth
    )
      this.updateView(this.view.width, this.view.height)
    if (video) this.vision?.pump(video, now)
    const aspect = this.view.srcHeight / this.view.srcWidth
    this.tracker.aspect = aspect
    const snapshot = this.tracker.sample(now)
    this.derived.update(snapshot, aspect)
    const debug = useSession.getState().debug
    const fxState = useFx.getState()
    const mode = useScene.getState().mode
    this.controller.update(snapshot, this.view, now, this.pointer)

    // Combo engine -> memes.
    const result = stepCombo(
      this.combo,
      useMemes.getState().rules,
      snapshot,
      now,
      mode,
    )
    this.comboScores = result.scores
    for (const f of result.fired) {
      const meme = useMemes.getState().byRule(f.ruleId) ?? null
      const handCond = meme?.trigger.all.find((c) => c.kind === 'hand')
      const gesture: HandGestureId | undefined =
        handCond?.kind === 'hand' ? handCond.gesture : undefined
      this.fx.trigger(
        meme,
        f.effect,
        { snapshot, view: this.view, gesture },
        now,
      )
      useFx.getState().set({ lastMeme: meme?.name ?? null })
    }

    // Adaptive quality + reduced motion.
    this.fx.reducedMotion = fxState.reducedMotion
    this.fx.reduceFlash = fxState.reduceFlash
    const targetDensity =
      (this.loop.stats.degraded ? 0.4 : 1) * (fxState.reducedMotion ? 0.5 : 1)
    this.fx.emitters.density +=
      (targetDensity - this.fx.emitters.density) * 0.02
    this.fx.update(dt, now, aspect)
    this.layersTransform(this.fx.shake.x, this.fx.shake.y)

    // Sound-reactive: mic level bounces items (spring), peaks burst particles.
    this.mic.sensitivity = fxState.micSensitivity
    if (this.mic.update(now) && fxState.soundReactive)
      this.fx.burst(
        'peak',
        this.fx.anchor('head', { snapshot, view: this.view }),
        aspect,
      )
    const target = fxState.soundReactive ? 1 + 0.25 * this.mic.level : 1
    this.pulseV += ((target - this.pulse) * 180 - this.pulseV * 14) * dt
    this.pulse += this.pulseV * dt
    this.creativeLayer.pulse = this.pulse

    this.props.active = fxState.activeProps
    const space = spaceFor(this.view, this.dpr)
    if (this.props.active.length) this.props.update(snapshot.faces, space, now)

    this.cameraLayer.bloomEnabled = !this.loop.stats.degraded
    this.cameraLayer.draw(video, this.view, this.dpr, now)
    this.creativeLayer.active = this.controller.activeStrokes
    this.creativeLayer.draw(this.view, this.dpr)
    this.fxLayer.showTestLabel = debug
    this.fxLayer.draw(
      this.view,
      this.dpr,
      snapshot,
      this.fx,
      this.props,
      now,
      vi.testLabel,
    )
    const pendingMeme = result.pending
      ? useMemes.getState().byRule(result.pending.ruleId)
      : undefined
    this.hudLayer.draw(this.view, this.dpr, {
      snapshot,
      hud: this.controller.hud,
      items: useScene.getState().items,
      trashSize: this.controller.trashRect.size,
      trashInset: this.controller.trashRect.inset,
      debug,
      pending:
        result.pending && pendingMeme
          ? { name: pendingMeme.name, progress: result.pending.progress }
          : null,
      micLevel: fxState.soundReactive ? this.mic.level : -1,
    })
    if (now - this.lastPublish > 100) {
      this.lastPublish = now
      this.publish(snapshot.hands.length, snapshot.faces.length)
    }
  }

  private layersTransform(x: number, y: number): void {
    if (x === 0 && y === 0) {
      if (this.shakeApplied) this.el.layers.style.transform = ''
      this.shakeApplied = false
      return
    }
    this.el.layers.style.transform =
      'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'
    this.shakeApplied = true
  }

  /** Fires a meme manually (button / no-camera mode). */
  triggerMeme(memeId: string): void {
    const meme = useMemes.getState().memes.find((m) => m.id === memeId)
    if (!meme) return
    this.fx.trigger(
      meme,
      meme.trigger.effect,
      { snapshot: this.tracker.snapshot, view: this.view },
      performance.now(),
    )
    useFx.getState().set({ lastMeme: meme.name })
  }

  async setSoundReactive(on: boolean): Promise<void> {
    const set = useFx.getState().set
    if (!on) {
      this.mic.stop()
      set({ soundReactive: false, micStatus: 'off' })
      return
    }
    set({ micStatus: 'starting' })
    try {
      await this.mic.start()
      this.mic.setRecordMic(useFx.getState().recordMic)
      set({ soundReactive: true, micStatus: 'on' })
    } catch {
      set({ soundReactive: false, micStatus: 'denied' })
    }
  }

  setMuted(muted: boolean): void {
    setMuted(muted)
    useFx.getState().set({ muted })
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
      live: {
        derived: { ...snapshot.derived },
        blendshapes: snapshot.faces[0]?.blendshapes ?? {},
        scores: this.comboScores,
        gestures: snapshot.hands.map((h) => ({ ...h.gestures })),
        particles: this.fx.pool.alive,
      },
    })
    useFx.getState().set({ micLevel: this.mic.level })
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
    this.controller.reset()
    this.mic.stop()
    this.fx.clear()
    this.el.root.removeEventListener('pointermove', this.onPointerMove)
    this.el.root.removeEventListener('pointerdown', this.onPointerDown)
    this.el.root.removeEventListener('pointerup', this.onPointerUp)
    this.el.root.removeEventListener('pointercancel', this.onPointerUp)
    this.el.root.removeEventListener('pointerleave', this.onPointerLeave)
    this.el.root.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('visibilitychange', this.onVisibility)
  }
}
