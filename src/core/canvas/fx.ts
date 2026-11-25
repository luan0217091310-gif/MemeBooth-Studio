import { effects, type AnchorKind, type EffectDef } from '@/config/effects'
import { playSound } from '@/core/audio/soundRegistry'
import { blobUrl } from '@/core/storage/blobUrls'
import type { HandGestureId, MemeDef, PerceptionSnapshot, Vec2 } from '@/types'
import type { StrokeSpace } from './brushes'
import { textFont } from './items'
import { SpriteAtlas, CELL } from './particles/atlas'
import { Emitters } from './particles/emitters'
import { ParticlePool } from './particles/pool'
import { visibleRect, type Viewport } from './viewport'

const MAX_CARDS = 6

interface Card {
  meme: MemeDef | null
  x: number
  y: number
  /** Width in stage-width units. */
  size: number
  born: number
  life: number
  wobble: number
}

interface FrameFx {
  kind: 'anime' | 'fire' | 'wave'
  born: number
  life: number
}

const memeImages = new Map<string, HTMLImageElement>()
function memeImage(meme: MemeDef): HTMLImageElement | null {
  let img = memeImages.get(meme.id)
  if (!img) {
    if (typeof Image === 'undefined') return null
    img = new Image()
    if (meme.visual.kind === 'svg')
      img.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(meme.visual.svg)
    else {
      const url = blobUrl(meme.visual.blobKey)
      if (!url) return null
      img.src = url
    }
    memeImages.set(meme.id, img)
  }
  return img.complete && img.naturalWidth ? img : null
}
/** Forget a cached meme image (custom meme replaced/deleted). */
export function evictMemeImage(id: string): void {
  memeImages.delete(id)
}

export interface TriggerContext {
  snapshot: PerceptionSnapshot
  view: Viewport
  /** Gesture that triggered (to find "the hand that did it"). */
  gesture?: HandGestureId
}

/**
 * Layer 2 effects: particles (pooled), meme cards, full-screen frames,
 * flash and screen shake. All positions are display space so exports at any
 * resolution match the preview.
 */
export class FxEngine {
  readonly pool = new ParticlePool(2000)
  readonly emitters = new Emitters(this.pool)
  readonly atlas = new SpriteAtlas()
  private cards: Card[] = []
  private frames: FrameFx[] = []
  private flashAt = -Infinity
  private flashTimes: number[] = []
  private shakeUntil = 0
  private shakeMs = 0
  reducedMotion = false
  reduceFlash = false
  /** Current shake offset in CSS pixels (applied by the stage). */
  readonly shake = { x: 0, y: 0 }

  /** Resolves an anchor to display space. */
  anchor(kind: AnchorKind, ctx: TriggerContext): Vec2 {
    const { snapshot, view } = ctx
    const r = visibleRect(view)
    const face = snapshot.faces[0]?.landmarks
    const top = { x: (r.x0 + r.x1) / 2, y: r.y0 + (r.y1 - r.y0) * 0.22 }
    switch (kind) {
      case 'hand': {
        let best = snapshot.hands[0]
        if (ctx.gesture) {
          let score = -1
          for (const h of snapshot.hands) {
            const v = h.gestures[ctx.gesture] ?? 0
            if (v > score) {
              score = v
              best = h
            }
          }
        }
        if (best) {
          const lm = best.landmarks
          return {
            x: (lm[0]!.x + lm[9]!.x) / 2,
            y: (lm[0]!.y + lm[9]!.y) / 2 - 0.08,
          }
        }
        return face ? this.anchor('head', ctx) : top
      }
      case 'head':
        if (face) {
          const h = Math.abs(face[152]!.y - face[10]!.y)
          return { x: face[10]!.x, y: face[10]!.y - h * 0.35 }
        }
        return top
      case 'eyes':
        return face
          ? {
              x: (face[33]!.x + face[263]!.x) / 2,
              y: (face[33]!.y + face[263]!.y) / 2,
            }
          : top
      case 'mouth':
        return face
          ? {
              x: (face[13]!.x + face[14]!.x) / 2,
              y: (face[13]!.y + face[14]!.y) / 2,
            }
          : top
      case 'top':
        return { x: 0.5, y: r.y0 }
      default:
        return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }
    }
  }

  /** Plays a meme: card + effect particles + frame + sound. */
  trigger(
    meme: MemeDef | null,
    effectId: string,
    ctx: TriggerContext,
    now: number,
  ): void {
    const fx: EffectDef | undefined = effects[effectId]
    const aspect = ctx.view.srcHeight / ctx.view.srcWidth
    if (fx?.particles)
      for (const p of fx.particles) {
        if (p.at === 'eyes' && ctx.snapshot.faces[0]) {
          const f = ctx.snapshot.faces[0].landmarks
          this.emitters.emit(p.preset, f[33]!, aspect)
          this.emitters.emit(p.preset, f[263]!, aspect)
        } else
          this.emitters.emit(
            p.preset,
            this.anchor(p.at, ctx),
            aspect,
            Math.PI / 2,
          )
      }
    if (fx?.frame)
      this.frames.push({
        kind: fx.frame,
        born: now,
        life: fx.durationMs ?? 2500,
      })
    if (fx?.flash) this.flash(now)
    if (fx?.shakeMs && !this.reducedMotion) {
      this.shakeUntil = now + fx.shakeMs
      this.shakeMs = fx.shakeMs
    }
    if (meme && (fx?.memeAt ?? 'head')) this.addCard(meme, fx, ctx, now)
    // Custom memes always play their own sound (synth, upload or recording).
    playSound(
      meme?.source === 'custom'
        ? meme.soundId
        : (fx?.sound ?? meme?.soundId ?? 'pop'),
    )
  }

  private addCard(
    meme: MemeDef,
    fx: EffectDef | undefined,
    ctx: TriggerContext,
    now: number,
  ): void {
    const face = ctx.snapshot.faces[0]?.landmarks
    const faceW = face ? Math.abs(face[454]!.x - face[234]!.x) : 0.2
    // Card no wider than ~1.1 face widths so it never hides most of the face.
    const r = visibleRect(ctx.view)
    // Also cap by the visible width (portrait phones only see the middle).
    const size = Math.min(
      0.2,
      (r.x1 - r.x0) * 0.32,
      Math.max(0.11, faceW * 1.1),
    )
    const pos = this.anchor(fx?.memeAt ?? 'head', ctx)
    const aspect = ctx.view.srcHeight / ctx.view.srcWidth
    const half = size / 2
    let x = Math.min(r.x1 - half, Math.max(r.x0 + half, pos.x))
    let y = Math.min(
      r.y1 - half / aspect,
      Math.max(r.y0 + half / aspect, pos.y - half / aspect),
    )
    // If the clamp pushed the card onto the face, move it beside the head.
    if (face && fx?.memeAt === 'head') {
      const fy0 = face[10]!.y
      const fy1 = face[152]!.y
      const overlaps = y + half / aspect > fy0 + (fy1 - fy0) * 0.3
      if (overlaps) {
        const side = face[10]!.x > 0.5 ? -1 : 1
        x = Math.min(
          r.x1 - half,
          Math.max(r.x0 + half, face[10]!.x + side * (faceW / 2 + half + 0.02)),
        )
        y = Math.max(r.y0 + half / aspect, (fy0 + fy1) / 2 - 0.05)
      }
    }
    // Step sideways until the card does not sit on a live card.
    for (let attempt = 0; attempt < 4; attempt++) {
      const clash = this.cards.some(
        (c) => Math.abs(c.x - x) < half && Math.abs(c.y - y) * aspect < half,
      )
      if (!clash) break
      const step = (attempt % 2 ? -1 : 1) * size * 1.05 * (1 + (attempt >> 1))
      x = Math.min(r.x1 - half, Math.max(r.x0 + half, pos.x + step))
    }
    if (this.cards.length >= MAX_CARDS) this.cards.shift()
    this.cards.push({
      meme,
      x,
      y,
      size,
      born: now,
      life: fx?.durationMs ?? 2200,
      wobble: (Math.random() - 0.5) * 0.3,
    })
  }

  flash(now: number): void {
    // Photosensitivity guard: never more than 3 flashes per second.
    this.flashTimes = this.flashTimes.filter((t) => now - t < 1000)
    if (this.flashTimes.length >= 3) return
    this.flashTimes.push(now)
    this.flashAt = now
  }

  burst(preset: string, at: Vec2, aspect: number): void {
    this.emitters.emit(preset, at, aspect)
  }

  update(dt: number, now: number, aspect: number): void {
    this.emitters.update(dt, aspect)
    this.pool.update(dt)
    // In-place removal: no per-frame array allocation.
    for (let i = this.cards.length - 1; i >= 0; i--)
      if (now - this.cards[i]!.born >= this.cards[i]!.life)
        this.cards.splice(i, 1)
    for (let i = this.frames.length - 1; i >= 0; i--)
      if (now - this.frames[i]!.born >= this.frames[i]!.life)
        this.frames.splice(i, 1)
    if (now < this.shakeUntil) {
      const k = (this.shakeUntil - now) / this.shakeMs
      this.shake.x = (Math.random() - 0.5) * 18 * k
      this.shake.y = (Math.random() - 0.5) * 18 * k
    } else {
      this.shake.x = 0
      this.shake.y = 0
    }
  }

  get busy(): boolean {
    return (
      this.pool.alive > 0 ||
      this.cards.length > 0 ||
      this.frames.length > 0 ||
      performance.now() - this.flashAt < 300
    )
  }

  draw(
    ctx: CanvasRenderingContext2D,
    space: StrokeSpace,
    w: number,
    h: number,
    now: number,
  ): void {
    for (const f of this.frames) this.drawFrame(ctx, f, w, h, now, space.unit)
    this.drawParticles(ctx, space)
    for (const c of this.cards) this.drawCard(ctx, c, space, now)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const ft = now - this.flashAt
    if (ft >= 0 && ft < 120 + 180) {
      const peak = this.reduceFlash ? 0.35 : 0.9
      ctx.globalAlpha = ft < 120 ? peak : peak * (1 - (ft - 120) / 180)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, s: StrokeSpace): void {
    const atlas = this.atlas.canvas
    if (!atlas || !this.atlas.ready || this.pool.alive === 0) return
    const p = this.pool
    for (let i = 0; i < p.capacity; i++) {
      const life = p.life[i]!
      if (life <= 0) continue
      const size = p.size[i]! * s.unit
      const rot = p.rotation[i]!
      const px = p.x[i]! * s.sx + s.ox
      const py = p.y[i]! * s.sy + s.oy
      ctx.globalAlpha = Math.min(
        1,
        life / 0.35,
        (p.maxLife[i]! - life) / 0.08 + 0.2,
      )
      if (rot === 0) {
        ctx.setTransform(1, 0, 0, 1, px, py)
      } else {
        const c = Math.cos(rot)
        const sn = Math.sin(rot)
        ctx.setTransform(c, sn, -sn, c, px, py)
      }
      ctx.drawImage(
        atlas,
        this.atlas.cellX(p.sprite[i]!, p.hue[i]!),
        0,
        CELL,
        CELL,
        -size / 2,
        -size / 2,
        size,
        size,
      )
    }
    ctx.globalAlpha = 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  private drawCard(
    ctx: CanvasRenderingContext2D,
    c: Card,
    s: StrokeSpace,
    now: number,
  ): void {
    const t = (now - c.born) / 1000
    // Springy pop-in with overshoot, fade out over the last 300 ms.
    const pop = this.reducedMotion ? 1 : 1 - Math.exp(-7 * t) * Math.cos(13 * t)
    const left = c.life - (now - c.born)
    const alpha = Math.min(1, left / 300)
    const size = c.size * s.unit * Math.max(0.05, pop)
    const x = c.x * s.sx + s.ox
    const y = c.y * s.sy + s.oy
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    ctx.rotate(c.wobble * Math.sin(t * 6) * (this.reducedMotion ? 0 : 1))
    const img = c.meme ? memeImage(c.meme) : null
    // No shadowBlur here: it is a per-frame Gaussian blur and costs ~10 ms
    // on software-rendered canvases when many cards are on screen.
    if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size)
    const cap = c.meme?.caption
    const fs = size * 0.2
    ctx.font = textFont(fs)
    ctx.textAlign = 'center'
    ctx.lineJoin = 'round'
    ctx.lineWidth = fs * 0.22
    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#fff'
    // Long captions are squeezed to 1.5x the card width (fillText maxWidth).
    const maxW = size * 1.5
    if (cap?.top) {
      ctx.textBaseline = 'bottom'
      const tx = cap.top.toLocaleUpperCase('vi')
      ctx.strokeText(tx, 0, -size / 2, maxW)
      ctx.fillText(tx, 0, -size / 2, maxW)
    }
    if (cap?.bottom) {
      ctx.textBaseline = 'top'
      const tx = cap.bottom.toLocaleUpperCase('vi')
      ctx.strokeText(tx, 0, size / 2 + fs * 0.1, maxW)
      ctx.fillText(tx, 0, size / 2 + fs * 0.1, maxW)
    }
    ctx.restore()
  }

  private drawFrame(
    ctx: CanvasRenderingContext2D,
    f: FrameFx,
    w: number,
    h: number,
    now: number,
    unit: number,
  ): void {
    const t = now - f.born
    const alpha = Math.min(1, t / 200, (f.life - t) / 400)
    const b = unit * 0.03
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = Math.max(0, alpha)
    if (f.kind === 'anime') {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#ffb5d8')
      g.addColorStop(1, '#cdb4ff')
      ctx.strokeStyle = g
      ctx.lineWidth = b * 2
      ctx.strokeRect(0, 0, w, h)
      // Speed lines from the corners.
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + t * 0.0004
        const r0 = Math.max(w, h) * 0.42
        const r1 = Math.max(w, h) * 0.75
        ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0)
        ctx.lineTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1)
      }
      ctx.stroke()
    } else if (f.kind === 'fire') {
      const flick = 0.75 + 0.25 * Math.sin(t * 0.03)
      for (const [x0, y0, x1, y1] of [
        [0, h, 0, h - b * 4],
        [0, 0, b * 3, 0],
        [w, 0, w - b * 3, 0],
      ] as const) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, 'rgba(255,90,20,' + 0.85 * flick + ')')
        g.addColorStop(1, 'rgba(255,200,40,0)')
        ctx.fillStyle = g
        if (y1 !== y0) ctx.fillRect(0, h - b * 4, w, b * 4)
        else ctx.fillRect(Math.min(x0, x1), 0, b * 3, h)
      }
    } else {
      ctx.strokeStyle = 'rgba(90,184,255,0.8)'
      ctx.lineWidth = b * 0.4
      for (let k = 0; k < 3; k++) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 12) {
          const y =
            h - b * (1 + k * 1.2) + Math.sin(x * 0.02 + t * 0.008 + k) * b * 0.5
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  clear(): void {
    this.pool.clear()
    this.emitters.clear()
    this.cards = []
    this.frames = []
  }
}
