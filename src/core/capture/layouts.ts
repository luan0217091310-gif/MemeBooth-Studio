import type { FrameId, LayoutId } from '@/types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface LayoutDef {
  id: LayoutId
  name: string
  shots: number
  width: number
  height: number
  cells: Rect[]
  /** Where the date + "MemeBooth" label goes. */
  label: Rect
}

export const layouts: Record<LayoutId, LayoutDef> = {
  polaroid: {
    id: 'polaroid',
    name: 'Polaroid',
    shots: 1,
    width: 1200,
    height: 1440,
    cells: [{ x: 60, y: 60, w: 1080, h: 1080 }],
    label: { x: 60, y: 1160, w: 1080, h: 240 },
  },
  strip: {
    id: 'strip',
    name: 'Strip 4x1',
    shots: 4,
    width: 1200,
    height: 3600,
    cells: [0, 1, 2, 3].map((i) => ({
      x: 60,
      y: 60 + i * 820,
      w: 1080,
      h: 780,
    })),
    label: { x: 60, y: 3340, w: 1080, h: 220 },
  },
  grid: {
    id: 'grid',
    name: 'Lưới 2x2',
    shots: 4,
    width: 2000,
    height: 1760,
    cells: [0, 1, 2, 3].map((i) => ({
      x: 50 + (i % 2) * 960,
      y: 50 + Math.floor(i / 2) * 720,
      w: 940,
      h: 700,
    })),
    label: { x: 50, y: 1490, w: 1900, h: 220 },
  },
  single: {
    id: 'single',
    name: 'Ảnh đơn 16:9',
    shots: 1,
    width: 1920,
    height: 1080,
    cells: [{ x: 0, y: 0, w: 1920, h: 1080 }],
    label: { x: 1280, y: 960, w: 600, h: 90 },
  },
}

export const layoutOrder: LayoutId[] = ['polaroid', 'strip', 'grid', 'single']

interface FrameStyle {
  bg: string
  ink: string
  accent: string
  /** Extra decoration drawn on the background. */
  deco: 'dots' | 'chrome' | 'tape' | 'neon'
}

export const frameStyles: Record<FrameId, FrameStyle> = {
  'frame-kawaii': {
    bg: '#fff4e6',
    ink: '#33233d',
    accent: '#ffb5d8',
    deco: 'dots',
  },
  'frame-y2k': {
    bg: '#dfe4ea',
    ink: '#14161f',
    accent: '#00e5ff',
    deco: 'chrome',
  },
  'frame-chaotic': {
    bg: '#ffe600',
    ink: '#000000',
    accent: '#ff3b30',
    deco: 'tape',
  },
  'frame-neon': {
    bg: '#0b0b1a',
    ink: '#eef0ff',
    accent: '#39ff14',
    deco: 'neon',
  },
}

/** Draws `src` into `r` with cover fit (center crop). */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource & { width: number; height: number },
  r: Rect,
  /** Intrinsic size when `src.width/height` are not the pixel size (video). */
  dims?: { width: number; height: number },
): void {
  const sz = dims ?? src
  if (!sz.width || !sz.height) return
  const s = Math.max(r.w / sz.width, r.h / sz.height)
  const sw = r.w / s
  const sh = r.h / s
  ctx.drawImage(
    src,
    (sz.width - sw) / 2,
    (sz.height - sh) / 2,
    sw,
    sh,
    r.x,
    r.y,
    r.w,
    r.h,
  )
}

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    p(date.getDate()) +
    '/' +
    p(date.getMonth() + 1) +
    '/' +
    date.getFullYear() +
    '  ' +
    p(date.getHours()) +
    ':' +
    p(date.getMinutes())
  )
}

/** Composes shots into the final layout image with the vibe frame. */
export function composeLayout(
  layout: LayoutDef,
  shots: readonly HTMLCanvasElement[],
  frame: FrameId,
  date = new Date(),
): HTMLCanvasElement {
  const style = frameStyles[frame] ?? frameStyles['frame-kawaii']!
  const c = document.createElement('canvas')
  c.width = layout.width
  c.height = layout.height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = style.bg
  ctx.fillRect(0, 0, c.width, c.height)
  // Background decoration.
  if (style.deco === 'dots') {
    ctx.fillStyle = style.accent
    for (let y = 20; y < c.height; y += 60)
      for (let x = (y / 60) % 2 ? 50 : 20; x < c.width; x += 60) {
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
      }
  } else if (style.deco === 'chrome') {
    const g = ctx.createLinearGradient(0, 0, c.width, c.height)
    g.addColorStop(0, '#f7f9fb')
    g.addColorStop(0.5, '#b9c2cf')
    g.addColorStop(1, '#eef2f6')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, c.width, c.height)
  }
  layout.cells.forEach((cell, i) => {
    const shot = shots[i] ?? shots[shots.length - 1]
    if (!shot) return
    drawCover(ctx, shot, cell)
    if (layout.id === 'single') return
    ctx.lineWidth = style.deco === 'neon' ? 6 : 4
    ctx.strokeStyle = style.deco === 'neon' ? style.accent : style.ink
    if (style.deco === 'neon') {
      ctx.shadowColor = style.accent
      ctx.shadowBlur = 18
    }
    ctx.strokeRect(cell.x, cell.y, cell.w, cell.h)
    ctx.shadowBlur = 0
    if (style.deco === 'tape') {
      ctx.save()
      ctx.translate(cell.x + 40, cell.y + 10)
      ctx.rotate(-0.5)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillRect(-60, -18, 140, 36)
      ctx.restore()
    }
  })
  // Label: date + small "MemeBooth".
  const L = layout.label
  const big = Math.min(L.h * 0.42, 96)
  ctx.fillStyle = layout.id === 'single' ? 'rgba(0,0,0,0.45)' : 'transparent'
  ctx.fillRect(L.x, L.y, L.w, L.h)
  ctx.fillStyle = layout.id === 'single' ? '#fff' : style.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 ' + big + 'px "Be Vietnam Pro", sans-serif'
  ctx.fillText('MemeBooth', L.x + L.w / 2, L.y + L.h * 0.38)
  ctx.font = '700 ' + big * 0.42 + 'px "Be Vietnam Pro", sans-serif'
  ctx.fillStyle =
    layout.id === 'single'
      ? '#fff'
      : style.deco === 'chrome'
        ? '#ff6a00'
        : style.ink
  ctx.fillText(stamp(date), L.x + L.w / 2, L.y + L.h * 0.78)
  return c
}
