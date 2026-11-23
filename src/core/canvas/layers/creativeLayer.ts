import { useScene } from '@/store/scene'
import type { Stroke } from '@/types'
import { getBrush, type StrokeSpace } from '../brushes'
import { drawItem } from '../items'
import type { Viewport } from '../viewport'

type Surface = OffscreenCanvas | HTMLCanvasElement
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

function makeSurface(w: number, h: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Pixel mapping for a viewport at a given device pixel ratio. */
export function spaceFor(view: Viewport, dpr: number): StrokeSpace {
  return {
    sx: view.srcWidth * view.scale * dpr,
    sy: view.srcHeight * view.scale * dpr,
    ox: view.offsetX * dpr,
    oy: view.offsetY * dpr,
    unit: view.srcWidth * view.scale * dpr,
  }
}

/**
 * Layer 1: persistent user content. Finished strokes are rendered once into
 * an offscreen cache and only rebuilt when the scene or size changes; each
 * frame draws the cache, the live stroke and the items.
 */
export class CreativeLayer {
  private ctx: CanvasRenderingContext2D | null
  private cache: Surface | null = null
  private cacheCtx: Ctx2D | null = null
  private cacheKey = ''
  /** Strokes still being drawn (not yet committed). */
  active: readonly Stroke[] = []
  /** Extra item scale (sound-reactive bounce, phase 3). */
  pulse = 1

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  private rebuild(space: StrokeSpace, key: string): void {
    const w = this.canvas.width
    const h = this.canvas.height
    if (!this.cache || this.cache.width !== w || this.cache.height !== h) {
      this.cache = makeSurface(w, h)
      this.cacheCtx = this.cache.getContext('2d') as Ctx2D | null
    }
    const ctx = this.cacheCtx
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)
    for (const stroke of useScene.getState().strokes)
      getBrush(stroke.brushId).draw(
        ctx as CanvasRenderingContext2D,
        stroke,
        space,
      )
    this.cacheKey = key
  }

  draw(view: Viewport, dpr: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const space = spaceFor(view, dpr)
    const { version, items } = useScene.getState()
    const key =
      version +
      ':' +
      this.canvas.width +
      'x' +
      this.canvas.height +
      ':' +
      view.offsetX +
      ',' +
      view.offsetY
    if (key !== this.cacheKey) this.rebuild(space, key)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.cache) ctx.drawImage(this.cache, 0, 0)
    for (const stroke of this.active)
      getBrush(stroke.brushId).draw(ctx, stroke, space)
    if (items.length) {
      const sorted =
        items.length > 1 ? [...items].sort((a, b) => a.z - b.z) : items
      for (const it of sorted) drawItem(ctx, it, space, this.pulse)
    }
  }
}
