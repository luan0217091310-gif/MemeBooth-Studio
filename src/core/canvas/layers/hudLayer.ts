import type { Cursor, HudState } from '@/core/interaction/controller'
import type { PerceptionSnapshot, SceneItem, Vec2 } from '@/types'
import { itemHalfSize } from '../items'
import { lengthToPixel, toPixel, type Viewport } from '../viewport'

// Hand skeleton connections (MediaPipe hand topology).
const HAND_EDGES: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
]
const FACE_KEYPOINTS = [1, 10, 33, 61, 152, 263, 291, 13, 14] as const

const tmpA: Vec2 = { x: 0, y: 0 }
const tmpB: Vec2 = { x: 0, y: 0 }

export interface HudInput {
  snapshot: PerceptionSnapshot
  hud: HudState
  items: readonly SceneItem[]
  trashSize: number
  trashInset: number
  debug: boolean
  /** Meme about to fire (hold progress 0..1). */
  pending: { name: string; progress: number } | null
  /** Mic level 0..1, or -1 when sound-reactive is off. */
  micLevel: number
}

/**
 * Layer 3: screen-only overlay. The compositor never references this canvas,
 * so nothing drawn here can leak into exported photos or videos.
 */
export class HudLayer {
  private ctx: CanvasRenderingContext2D | null
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  draw(view: Viewport, dpr: number, input: HudInput): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const { snapshot, debug } = input
    if (debug) {
      ctx.lineWidth = 2
      for (const hand of snapshot.hands) {
        const lm = hand.landmarks
        ctx.strokeStyle =
          hand.handedness === 'Right'
            ? 'rgba(57,255,20,0.85)'
            : 'rgba(0,229,255,0.85)'
        ctx.beginPath()
        for (const [a, b] of HAND_EDGES) {
          const pa = lm[a]
          const pb = lm[b]
          if (!pa || !pb) continue
          toPixel(view, pa, tmpA)
          toPixel(view, pb, tmpB)
          ctx.moveTo(tmpA.x, tmpA.y)
          ctx.lineTo(tmpB.x, tmpB.y)
        }
        ctx.stroke()
        const wrist = lm[0]
        if (wrist) {
          toPixel(view, wrist, tmpA)
          ctx.fillStyle = '#fff'
          ctx.font = '600 13px "Be Vietnam Pro", sans-serif'
          ctx.fillText(hand.handedness, tmpA.x + 8, tmpA.y + 16)
        }
      }
      ctx.fillStyle = 'rgba(255,181,216,0.9)'
      for (const face of snapshot.faces) {
        for (const i of FACE_KEYPOINTS) {
          const p = face.landmarks[i]
          if (!p) continue
          toPixel(view, p, tmpA)
          ctx.fillRect(tmpA.x - 2, tmpA.y - 2, 4, 4)
        }
      }
    }
    const { hud } = input
    // Outline hovered / grabbed items.
    if (hud.highlight.size) {
      ctx.save()
      ctx.setLineDash([8, 6])
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#ff4fd8'
      for (const item of input.items) {
        if (!hud.highlight.has(item.id)) continue
        const { hw, hh } = itemHalfSize(item)
        toPixel(view, item, tmpA)
        const unit = lengthToPixel(view, 1)
        ctx.save()
        ctx.translate(tmpA.x, tmpA.y)
        ctx.rotate(item.rotation)
        ctx.strokeRect(
          -hw * unit - 6,
          -hh * unit - 6,
          hw * unit * 2 + 12,
          hh * unit * 2 + 12,
        )
        ctx.restore()
      }
      ctx.restore()
    }
    if (hud.trash.visible)
      this.trash(ctx, view, input.trashSize, input.trashInset, hud.trash.hot)
    if (input.pending) this.pending(ctx, view, input.pending)
    if (input.micLevel >= 0) this.micBar(ctx, view, input.micLevel)
    for (const c of hud.cursors)
      this.cursor(ctx, toPixel(view, c.pos, tmpA), view, c, hud.eraserRadius)
  }

  private pending(
    ctx: CanvasRenderingContext2D,
    view: Viewport,
    p: { name: string; progress: number },
  ): void {
    const cx = view.width / 2
    const cy = 92
    const r = 26
    ctx.save()
    ctx.fillStyle = 'rgba(40,30,50,0.7)'
    ctx.beginPath()
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#ff4fd8'
    ctx.beginPath()
    ctx.arc(
      cx,
      cy,
      r,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.progress),
    )
    ctx.stroke()
    ctx.font = '800 15px "Be Vietnam Pro", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.strokeText(p.name, cx, cy + r + 10)
    ctx.fillStyle = '#fff'
    ctx.fillText(p.name, cx, cy + r + 10)
    ctx.restore()
  }

  private micBar(
    ctx: CanvasRenderingContext2D,
    view: Viewport,
    level: number,
  ): void {
    const h = 120
    const x = view.width - 22
    const y = view.height / 2 - h / 2
    ctx.save()
    ctx.fillStyle = 'rgba(40,30,50,0.6)'
    ctx.beginPath()
    ctx.roundRect(x, y, 10, h, 5)
    ctx.fill()
    ctx.fillStyle = level > 0.85 ? '#ff3b30' : '#39ff14'
    const fh = h * Math.min(1, level)
    ctx.beginPath()
    ctx.roundRect(x, y + h - fh, 10, fh, 5)
    ctx.fill()
    ctx.restore()
  }

  private trash(
    ctx: CanvasRenderingContext2D,
    view: Viewport,
    size: number,
    inset: number,
    hot: boolean,
  ): void {
    const x = view.width - inset - size
    const y = view.height - inset - size
    ctx.save()
    ctx.fillStyle = hot ? 'rgba(255,59,48,0.9)' : 'rgba(40,30,50,0.6)'
    ctx.beginPath()
    ctx.roundRect(x, y, size, size, 18)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    const cx = x + size / 2
    const cy = y + size / 2
    const s = hot ? 1.15 : 1
    ctx.beginPath()
    ctx.moveTo(cx - 14 * s, cy - 10 * s)
    ctx.lineTo(cx + 14 * s, cy - 10 * s)
    ctx.moveTo(cx - 5 * s, cy - 14 * s)
    ctx.lineTo(cx + 5 * s, cy - 14 * s)
    ctx.rect(cx - 10 * s, cy - 6 * s, 20 * s, 22 * s)
    ctx.stroke()
    ctx.restore()
  }

  private cursor(
    ctx: CanvasRenderingContext2D,
    p: Vec2,
    view: Viewport,
    c: Cursor,
    eraserRadius: number,
  ): void {
    const r = Math.max(9, lengthToPixel(view, 0.012))
    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 4
    switch (c.kind) {
      case 'pen':
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = c.color
        ctx.fill()
        ctx.stroke()
        break
      case 'erase': {
        ctx.beginPath()
        ctx.arc(p.x, p.y, lengthToPixel(view, eraserRadius), 0, Math.PI * 2)
        ctx.setLineDash([6, 5])
        ctx.stroke()
        break
      }
      case 'grab':
      case 'grabbing':
        ctx.beginPath()
        ctx.arc(
          p.x,
          p.y,
          c.kind === 'grabbing' ? r * 0.7 : r * 1.2,
          0,
          Math.PI * 2,
        )
        ctx.strokeStyle = '#ff4fd8'
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,79,216,0.35)'
        ctx.fill()
        break
      case 'pause':
        ctx.fillStyle = '#fff'
        ctx.fillRect(p.x - r * 0.6, p.y - r * 0.7, r * 0.4, r * 1.4)
        ctx.fillRect(p.x + r * 0.2, p.y - r * 0.7, r * 0.4, r * 1.4)
        if (c.progress > 0) {
          ctx.beginPath()
          ctx.arc(
            p.x,
            p.y,
            r * 2.2,
            -Math.PI / 2,
            -Math.PI / 2 + c.progress * Math.PI * 2,
          )
          ctx.lineWidth = 6
          ctx.strokeStyle = '#ff3b30'
          ctx.stroke()
        }
        break
      default:
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = '#ff4fd8'
        ctx.fill()
    }
    ctx.restore()
  }
}
