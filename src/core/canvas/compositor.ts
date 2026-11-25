import type { PerceptionSnapshot } from '@/types'
import type { FxEngine } from './fx'
import { CameraLayer } from './layers/cameraLayer'
import { CreativeLayer } from './layers/creativeLayer'
import { FxLayer } from './layers/fxLayer'
import type { ArProps } from './props/arProps'
import { createViewport, type Viewport } from './viewport'
import type { Stroke, FilterParams } from '@/types'

export interface CompositorSource {
  video: HTMLVideoElement | null
  /** Stage viewport, used to reproduce the exact preview crop. */
  view: Viewport
  snapshot: PerceptionSnapshot
  fx: FxEngine
  props: ArProps
  activeStrokes: readonly Stroke[]
  filter: FilterParams
  beauty: number
  mirror: boolean
  shake: { x: number; y: number }
}

/**
 * Renders Layers 0-2 (never the HUD) into one canvas at an arbitrary size.
 * It owns its own layer instances, so exports are rendered at output
 * resolution instead of upscaling the preview. Output keeps the preview crop.
 */
export class Compositor {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private camera: CameraLayer
  private creative: CreativeLayer
  private fxLayer: FxLayer
  private cams: HTMLCanvasElement[]
  width = 0
  height = 0

  constructor() {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')!
    this.cams = [0, 1, 2].map(() => document.createElement('canvas'))
    this.camera = new CameraLayer(this.cams[0]!)
    this.creative = new CreativeLayer(this.cams[1]!)
    this.fxLayer = new FxLayer(this.cams[2]!)
  }

  /**
   * Output size for a given long edge: same aspect as the stage, but never
   * more source pixels than the camera actually provides.
   */
  static sizeFor(view: Viewport, longEdge: number): { w: number; h: number } {
    // Visible source region (in source pixels) of the cover-fitted stage.
    const visW = Math.min(view.srcWidth, view.width / view.scale)
    const visH = Math.min(view.srcHeight, view.height / view.scale)
    const k = Math.min(longEdge / Math.max(visW, visH), 4)
    return {
      w: Math.max(2, Math.round(visW * k)),
      h: Math.max(2, Math.round(visH * k)),
    }
  }

  resize(w: number, h: number): void {
    if (this.width === w && this.height === h) return
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
    this.camera.resize(w, h)
    this.creative.resize(w, h)
    this.fxLayer.resize(w, h)
  }

  render(src: CompositorSource, now: number): HTMLCanvasElement {
    const { w, h } = { w: this.width, h: this.height }
    const view = createViewport(w, h, src.view.srcWidth, src.view.srcHeight)
    this.camera.filter = src.filter
    this.camera.beauty = src.beauty
    this.camera.mirror = src.mirror
    this.camera.draw(src.video, view, 1, now)
    this.creative.active = src.activeStrokes
    this.creative.draw(view, 1)
    this.fxLayer.draw(view, 1, src.snapshot, src.fx, src.props, now, '')
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    // Screen shake scaled from CSS pixels to output pixels.
    const k = w / Math.max(1, src.view.width)
    ctx.translate(src.shake.x * k, src.shake.y * k)
    for (const c of this.cams) ctx.drawImage(c, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return this.canvas
  }
}
