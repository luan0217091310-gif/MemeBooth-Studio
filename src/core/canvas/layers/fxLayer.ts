import type { PerceptionSnapshot, Vec2 } from '@/types'
import type { FxEngine } from '../fx'
import type { ArProps } from '../props/arProps'
import { spaceFor } from './creativeLayer'
import { lengthToPixel, toPixel, visibleRect, type Viewport } from '../viewport'

const tmp: Vec2 = { x: 0, y: 0 }

/**
 * Layer 2: dynamic FX (AR props, particles, meme cards, frames, flash).
 * Never flips the canvas, so text always reads correctly. Skips all work
 * when nothing is active.
 */
export class FxLayer {
  private ctx: CanvasRenderingContext2D | null
  private dirty = true
  showTestLabel = false
  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      this.dirty = true
    }
  }

  draw(
    view: Viewport,
    dpr: number,
    snapshot: PerceptionSnapshot,
    fx: FxEngine,
    props: ArProps,
    now: number,
    label: string,
  ): void {
    const ctx = this.ctx
    if (!ctx) return
    const active = fx.busy || props.active.length > 0 || this.showTestLabel
    if (!active && !this.dirty) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.dirty = active
    if (!active) return
    const space = spaceFor(view, dpr)
    props.draw(ctx, now)
    fx.draw(ctx, space, this.canvas.width, this.canvas.height, now)
    if (this.showTestLabel) this.testLabel(ctx, view, dpr, snapshot, label)
  }

  private testLabel(
    ctx: CanvasRenderingContext2D,
    view: Viewport,
    dpr: number,
    snapshot: PerceptionSnapshot,
    label: string,
  ): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const forehead = snapshot.faces[0]?.landmarks[10]
    const r = visibleRect(view)
    const anchor = forehead ?? { x: 0.5, y: r.y0 + (r.y1 - r.y0) * 0.2 }
    toPixel(view, anchor, tmp)
    const size = Math.max(18, lengthToPixel(view, 0.035))
    ctx.font = '900 ' + size + 'px "Be Vietnam Pro", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.lineJoin = 'round'
    ctx.lineWidth = size * 0.18
    ctx.strokeStyle = '#000'
    ctx.strokeText(label, tmp.x, tmp.y - size * 1.6)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, tmp.x, tmp.y - size * 1.6)
  }
}
