import type { BrushId, Stroke, StrokePoint } from '@/types'

/** Maps a display-space point to target-canvas pixels. */
export interface StrokeSpace {
  /** Pixels per display unit along x and y (cover-scaled, includes dpr). */
  sx: number
  sy: number
  ox: number
  oy: number
  /** Pixels per unit of stage width (stroke widths are relative to it). */
  unit: number
}

export interface BrushRenderer {
  id: BrushId
  /** Draws a full stroke. Must not flip the canvas. */
  draw(ctx: CanvasRenderingContext2D, stroke: Stroke, space: StrokeSpace): void
}

const px = (p: StrokePoint, s: StrokeSpace) => p[0] * s.sx + s.ox
const py = (p: StrokePoint, s: StrokeSpace) => p[1] * s.sy + s.oy

/** Width shrinks slightly with speed (width-units per second). */
function speedFactor(a: StrokePoint, b: StrokePoint): number {
  const dt = Math.max(1, b[2] - a[2]) / 1000
  const v = Math.hypot(b[0] - a[0], b[1] - a[1]) / dt
  return Math.min(1, Math.max(0.6, 1.08 - v * 0.12))
}

/**
 * Midpoint-smoothed quadratic Bezier, emitted segment by segment so each
 * segment can have its own width/colour. `seg` receives start/control/end.
 */
function forEachSegment(
  stroke: Stroke,
  s: StrokeSpace,
  seg: (
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    a: StrokePoint,
    b: StrokePoint,
    i: number,
  ) => void,
): void {
  const pts = stroke.points
  if (pts.length < 2) return
  let x0 = px(pts[0]!, s)
  let y0 = py(pts[0]!, s)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const ax = px(a, s)
    const ay = py(a, s)
    const bx = px(b, s)
    const by = py(b, s)
    const last = i === pts.length - 1
    const mx = last ? bx : (ax + bx) / 2
    const my = last ? by : (ay + by) / 2
    if (i === 1) seg(x0, y0, (x0 + mx) / 2, (y0 + my) / 2, mx, my, a, b, i)
    else seg(x0, y0, ax, ay, mx, my, a, b, i)
    x0 = mx
    y0 = my
  }
}

function dot(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  s: StrokeSpace,
  r: number,
) {
  const p = stroke.points[0]
  if (!p || stroke.points.length > 1) return false
  ctx.beginPath()
  ctx.arc(px(p, s), py(p, s), r, 0, Math.PI * 2)
  ctx.fill()
  return true
}

function plain(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  s: StrokeSpace,
  widthPx: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (dot(ctx, stroke, s, widthPx / 2)) return
  forEachSegment(stroke, s, (x0, y0, cx, cy, x1, y1, a, b) => {
    ctx.lineWidth = widthPx * speedFactor(a, b)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(cx, cy, x1, y1)
    ctx.stroke()
  })
}

/** Deterministic pseudo-random in [0,1) so cached and live renders match. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.4 : r
    const a = (i * Math.PI) / 4 - Math.PI / 2
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}

const pastel: BrushRenderer = {
  id: 'pastel',
  draw(ctx, stroke, s) {
    ctx.save()
    ctx.globalAlpha = 0.92
    plain(ctx, stroke, s, stroke.width * s.unit, stroke.color)
    ctx.restore()
  },
}

const neon: BrushRenderer = {
  id: 'neon',
  draw(ctx, stroke, s) {
    const w = stroke.width * s.unit
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.shadowColor = stroke.color
    ctx.shadowBlur = w * 2.2
    plain(ctx, stroke, s, w, stroke.color)
    ctx.shadowBlur = 0
    plain(ctx, stroke, s, w * 0.35, '#ffffff')
    ctx.restore()
  },
}

const rainbow: BrushRenderer = {
  id: 'rainbow',
  draw(ctx, stroke, s) {
    const w = stroke.width * s.unit
    let length = 0
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = 'hsl(0 90% 62%)'
    if (!dot(ctx, stroke, s, w / 2))
      forEachSegment(stroke, s, (x0, y0, cx, cy, x1, y1, a, b) => {
        length += Math.hypot(x1 - x0, y1 - y0)
        ctx.strokeStyle =
          'hsl(' + (((length / s.unit) * 900) % 360) + ' 90% 62%)'
        ctx.lineWidth = w * speedFactor(a, b)
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.quadraticCurveTo(cx, cy, x1, y1)
        ctx.stroke()
      })
    ctx.restore()
  },
}

const sparkle: BrushRenderer = {
  id: 'sparkle',
  draw(ctx, stroke, s) {
    const w = stroke.width * s.unit
    ctx.save()
    plain(ctx, stroke, s, w * 0.7, stroke.color)
    ctx.fillStyle = '#fffbe0'
    ctx.shadowColor = '#fff6a8'
    ctx.shadowBlur = w
    stroke.points.forEach((p, i) => {
      const h = hash(i + p[2])
      if (h > 0.45) return
      const ang = hash(i * 3.1) * Math.PI * 2
      const off = w * (0.8 + hash(i * 7.7) * 1.4)
      star(
        ctx,
        px(p, s) + Math.cos(ang) * off,
        py(p, s) + Math.sin(ang) * off,
        w * (0.35 + h),
      )
    })
    ctx.restore()
  },
}

const chalk: BrushRenderer = {
  id: 'chalk',
  draw(ctx, stroke, s) {
    const w = stroke.width * s.unit
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    for (let pass = 0; pass < 4; pass++) {
      ctx.globalAlpha = 0.35
      const jx = (hash(pass * 11) - 0.5) * w * 0.6
      const jy = (hash(pass * 23) - 0.5) * w * 0.6
      ctx.lineWidth = w * (0.35 + hash(pass) * 0.3)
      ctx.beginPath()
      stroke.points.forEach((p, i) => {
        const n = (hash(i * 5 + pass) - 0.5) * w * 0.35
        const x = px(p, s) + jx + n
        const y = py(p, s) + jy - n
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
    // Grain: tiny specks along the stroke.
    ctx.globalAlpha = 0.5
    stroke.points.forEach((p, i) => {
      const r = w * 0.12
      ctx.fillRect(
        px(p, s) + (hash(i * 13) - 0.5) * w,
        py(p, s) + (hash(i * 17) - 0.5) * w,
        r,
        r,
      )
    })
    ctx.restore()
  },
}

const dashed: BrushRenderer = {
  id: 'dashed',
  draw(ctx, stroke, s) {
    const w = stroke.width * s.unit
    ctx.save()
    ctx.setLineDash([w * 1.6, w * 1.4])
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = w * 0.8
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    if (!dot(ctx, stroke, s, w / 2)) {
      // Single path so the dash pattern flows continuously.
      ctx.beginPath()
      let started = false
      forEachSegment(stroke, s, (x0, y0, cx, cy, x1, y1) => {
        if (!started) ctx.moveTo(x0, y0)
        started = true
        ctx.quadraticCurveTo(cx, cy, x1, y1)
      })
      ctx.stroke()
    }
    ctx.restore()
  },
}

/** Bold black line with white outline (Chaotic Meme default). */
const bold: BrushRenderer = {
  id: 'bold',
  draw(ctx, stroke, s) {
    const w = stroke.width * s.unit
    plain(ctx, stroke, s, w * 1.6, '#ffffff')
    plain(ctx, stroke, s, w, stroke.color)
  },
}

export const brushes: Record<string, BrushRenderer> = {
  pastel,
  neon,
  rainbow,
  sparkle,
  chalk,
  dashed,
  bold,
}

export const brushOrder: BrushId[] = [
  'pastel',
  'neon',
  'rainbow',
  'sparkle',
  'chalk',
  'dashed',
  'bold',
]

export function getBrush(id: BrushId): BrushRenderer {
  return brushes[id] ?? pastel
}
