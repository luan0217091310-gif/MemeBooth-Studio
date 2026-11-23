// Particle sprites, rasterized once from SVG into a single atlas canvas.
const S = (body: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  body +
  '</svg>'

export const SPRITES = {
  heart: S(
    '<path d="M32 56L8 32a13 13 0 0 1 24-18a13 13 0 0 1 24 18z" fill="#ff6fa5"/><circle cx="21" cy="24" r="4" fill="#fff" opacity=".7"/>',
  ),
  heartPastel: S(
    '<path d="M32 56L8 32a13 13 0 0 1 24-18a13 13 0 0 1 24 18z" fill="#ffc2dc"/>',
  ),
  star: S(
    '<path d="M32 4l8 18 20 2-15 13 5 20-18-11-18 11 5-20L4 24l20-2z" fill="#ffe14d"/>',
  ),
  sparkle: S(
    '<path d="M32 2q4 26 30 30-26 4-30 30-4-26-30-30 26-4 30-30z" fill="#fffbd0"/>',
  ),
  bubble: S(
    '<circle cx="32" cy="32" r="26" fill="#bfe9ff" fill-opacity=".35" stroke="#e6f7ff" stroke-width="4"/><circle cx="22" cy="22" r="6" fill="#fff" opacity=".8"/>',
  ),
  flame: S(
    '<path d="M32 62c-14 0-22-10-20-22 2-10 10-14 10-26 8 6 11 13 10 20 4-3 6-7 6-12 10 9 14 19 12 28-2 8-8 12-18 12z" fill="#ff7a2f"/><path d="M32 60c-6 0-9-4-8-9 1-4 5-6 5-11 5 4 9 8 9 12 0 5-2 8-6 8z" fill="#ffd84d"/>',
  ),
  drop: S(
    '<path d="M32 4C24 22 14 32 14 42a18 18 0 0 0 36 0c0-10-10-20-18-38z" fill="#7cc8ff"/><ellipse cx="25" cy="42" rx="4" ry="7" fill="#fff" opacity=".7"/>',
  ),
  butterfly: S(
    '<path d="M32 30C22 8 4 10 8 26c3 10 14 10 24 6zM32 30C42 8 60 10 56 26c-3 10-14 10-24 6zM32 34c-8 4-18 12-12 20 4 4 10-4 12-14zM32 34c8 4 18 12 12 20-4 4-10-4-12-14z" fill="#ff4fd8"/><rect x="30" y="20" width="4" height="30" rx="2" fill="#2b1d33"/>',
  ),
  bolt: S('<path d="M38 2L10 36h18l-6 26 32-38H36z" fill="#fff35a"/>'),
  pixel: S('<rect x="12" y="12" width="40" height="40" fill="#39ff14"/>'),
  pixelPurple: S('<rect x="12" y="12" width="40" height="40" fill="#b026ff"/>'),
  note: S(
    '<path d="M24 50V12l28-6v36" fill="none" stroke="#fff" stroke-width="5"/><ellipse cx="18" cy="50" rx="9" ry="7" fill="#fff"/><ellipse cx="46" cy="44" rx="9" ry="7" fill="#fff"/>',
  ),
  question: S(
    '<path d="M20 22a12 12 0 1 1 18 11c-4 3-6 5-6 10" fill="none" stroke="#ff9f1c" stroke-width="8" stroke-linecap="round"/><circle cx="32" cy="56" r="5" fill="#ff9f1c"/>',
  ),
  balloon: S(
    '<ellipse cx="32" cy="26" rx="18" ry="22" fill="#ff6f91"/><path d="M32 48q-6 8 0 14" fill="none" stroke="#fff" stroke-width="2"/>',
  ),
  kiss: S(
    '<path d="M6 32q14-16 26-6 12-10 26 6-12 16-26 16T6 32z" fill="#ff3b6b"/>',
  ),
} as const

export type SpriteName = keyof typeof SPRITES | 'confetti'
const NAMES = Object.keys(SPRITES) as (keyof typeof SPRITES)[]
/** Confetti is drawn in 12 hues; the particle's `hue` picks the variant. */
export const CONFETTI_HUES = 12
export const CELL = 64

export function spriteIndex(name: SpriteName): number {
  return name === 'confetti' ? 255 : NAMES.indexOf(name)
}

export class SpriteAtlas {
  readonly canvas: HTMLCanvasElement | null
  ready = false
  private cols: number

  constructor() {
    this.cols = NAMES.length + CONFETTI_HUES
    if (typeof document === 'undefined') {
      this.canvas = null
      return
    }
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.cols * CELL
    this.canvas.height = CELL
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    // Confetti variants (procedural rectangles in 12 hues).
    for (let h = 0; h < CONFETTI_HUES; h++) {
      ctx.fillStyle = 'hsl(' + (h * 360) / CONFETTI_HUES + ' 90% 62%)'
      ctx.fillRect((NAMES.length + h) * CELL + 20, 8, 24, 48)
    }
    let pending = NAMES.length
    NAMES.forEach((name, i) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, i * CELL, 0, CELL, CELL)
        if (--pending === 0) this.ready = true
      }
      img.onerror = () => {
        if (--pending === 0) this.ready = true
      }
      img.src =
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SPRITES[name])
    })
  }

  /** Source x of a sprite cell. */
  cellX(sprite: number, hue: number): number {
    if (sprite === 255)
      return (NAMES.length + (Math.floor(hue) % CONFETTI_HUES)) * CELL
    return sprite * CELL
  }
}
