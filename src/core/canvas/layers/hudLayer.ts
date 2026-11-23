import type { PerceptionSnapshot, Vec2 } from '@/types'
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
  pointer: Vec2 | null
  debug: boolean
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
    // Fingertip cursors (index tip = landmark 8).
    for (const hand of snapshot.hands) {
      const tip = hand.landmarks[8]
      if (tip) this.cursor(ctx, toPixel(view, tip, tmpA), view)
    }
    if (input.pointer)
      this.cursor(ctx, toPixel(view, input.pointer, tmpA), view)
  }

  private cursor(ctx: CanvasRenderingContext2D, p: Vec2, view: Viewport): void {
    const r = Math.max(9, lengthToPixel(view, 0.012))
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#ff4fd8'
    ctx.fill()
  }
}
