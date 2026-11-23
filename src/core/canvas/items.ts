import { drawConfig } from '@/config/gestures'
import { STICKER_SIZE, TEXT_SIZE, stickerImage } from '@/config/stickers'
import type { SceneItem, Vec2 } from '@/types'
import type { StrokeSpace } from './brushes'

/** Half extents in stage-width units. */
export function itemHalfSize(item: SceneItem): { hw: number; hh: number } {
  if (item.kind === 'sticker') {
    const h = (STICKER_SIZE * item.scale) / 2
    return { hw: h, hh: h }
  }
  const size = TEXT_SIZE * item.scale
  const longest = Math.max(1, ...item.text.split('\n').map((l) => l.length))
  const lines = item.text.split('\n').length
  return { hw: (longest * size * 0.62) / 2, hh: (lines * size * 1.15) / 2 }
}

/** Distance from p to the item's rotated box (0 when inside), width units. */
export function itemDistance(item: SceneItem, p: Vec2, aspect: number): number {
  const dx = p.x - item.x
  const dy = (p.y - item.y) * aspect
  const c = Math.cos(-item.rotation)
  const s = Math.sin(-item.rotation)
  const lx = dx * c - dy * s
  const ly = dx * s + dy * c
  const { hw, hh } = itemHalfSize(item)
  return Math.hypot(
    Math.max(0, Math.abs(lx) - hw),
    Math.max(0, Math.abs(ly) - hh),
  )
}

/** Nearest item within grab radius (topmost on ties). */
export function hitItem(
  items: readonly SceneItem[],
  p: Vec2,
  aspect: number,
  radius = drawConfig.grabRadius,
): SceneItem | null {
  let best: SceneItem | null = null
  let bestD = Infinity
  for (const it of items) {
    const d = itemDistance(it, p, aspect)
    if (d > radius) continue
    if (
      d < bestD - 1e-6 ||
      (Math.abs(d - bestD) < 1e-6 && best && it.z > best.z)
    ) {
      best = it
      bestD = d
    }
  }
  return best
}

export function textFont(sizePx: number): string {
  return (
    '900 ' + sizePx.toFixed(1) + 'px "Be Vietnam Pro", system-ui, sans-serif'
  )
}

/** Draws a sticker or text item. `pulse` is extra scale (sound-reactive). */
export function drawItem(
  ctx: CanvasRenderingContext2D,
  item: SceneItem,
  space: StrokeSpace,
  pulse = 1,
): void {
  const x = item.x * space.sx + space.ox
  const y = item.y * space.sy + space.oy
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(item.rotation)
  const scale = item.scale * pulse
  if (item.kind === 'sticker') {
    const img = stickerImage(item.stickerId)
    const size = STICKER_SIZE * scale * space.unit
    if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size)
  } else {
    const size = TEXT_SIZE * scale * space.unit
    ctx.font = textFont(size)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    const lines = item.text.split('\n')
    lines.forEach((line, i) => {
      const ly = (i - (lines.length - 1) / 2) * size * 1.15
      const text = item.style === 'meme' ? line.toLocaleUpperCase('vi') : line
      if (item.style === 'meme') {
        ctx.lineWidth = size * 0.22
        ctx.strokeStyle = '#000'
        ctx.strokeText(text, 0, ly)
        ctx.fillStyle = '#fff'
      } else {
        ctx.lineWidth = size * 0.3
        ctx.strokeStyle = '#fff'
        ctx.shadowColor = 'rgba(0,0,0,0.25)'
        ctx.shadowOffsetY = size * 0.06
        ctx.strokeText(text, 0, ly)
        ctx.shadowColor = 'transparent'
        ctx.fillStyle = item.color
      }
      ctx.fillText(text, 0, ly)
    })
  }
  ctx.restore()
}
