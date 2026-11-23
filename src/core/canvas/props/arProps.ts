import {
  props as propDefs,
  type PropAnchor,
  type PropDef,
} from '@/config/props'
import { OneEuroFilter } from '@/core/ai/filters/oneEuro'
import { isMirrored } from '@/core/ai/toDisplay'
import type { FaceState, Vec2 } from '@/types'
import type { StrokeSpace } from '../brushes'

const FADE_MS = 400
const images = new Map<string, HTMLImageElement>()

function propImage(def: PropDef): HTMLImageElement | null {
  let img = images.get(def.id)
  if (!img) {
    if (typeof Image === 'undefined') return null
    img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(def.svg)
    images.set(def.id, img)
  }
  return img.complete && img.naturalWidth ? img : null
}

interface Pose {
  /**
   * Smoothed anchor points in display space, so the same pose renders at any
   * output resolution (preview, photo, video).
   */
  anchors: Record<PropAnchor, Vec2>
  angle: number
  /** Eye distance in stage-width units. */
  eyeDist: number
  squash: number
  lastSeen: number
}

class FacePose {
  fx = new OneEuroFilter({ minCutoff: 1.2, beta: 0.02, dCutoff: 1 })
  fy = new OneEuroFilter({ minCutoff: 1.2, beta: 0.02, dCutoff: 1 })
  fa = new OneEuroFilter({ minCutoff: 1, beta: 0.01, dCutoff: 1 })
  fs = new OneEuroFilter({ minCutoff: 0.8, beta: 0.005, dCutoff: 1 })
  pose: Pose | null = null
}

const mid = (a: Vec2, b: Vec2): Vec2 => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

/** Yaw (radians) from a column-major 4x4 facial transformation matrix. */
export function yawFromMatrix(m: Float32Array | undefined): number {
  if (!m || m.length < 16) return 0
  // R[2][0] in column-major is m[2]; yaw about the vertical axis.
  return Math.asin(Math.max(-1, Math.min(1, -m[2]!)))
}

/**
 * Face-anchored props on Layer 2. Position, angle and scale are smoothed
 * separately; when a face is lost the props fade out in place.
 */
export class ArProps {
  private faces: FacePose[] = []
  active: string[] = []

  update(faces: readonly FaceState[], space: StrokeSpace, now: number): void {
    faces.forEach((face, i) => {
      const lm = face.landmarks
      if (lm.length < 300) return
      const fp = this.faces[i] ?? (this.faces[i] = new FacePose())
      const px = (p: Vec2): Vec2 => ({
        x: p.x * space.sx + space.ox,
        y: p.y * space.sy + space.oy,
      })
      // Outer eye corners 33 / 263. Mirroring swaps which one is on screen-left.
      let a = px(lm[33]!)
      let b = px(lm[263]!)
      if (isMirrored()) [a, b] = [b, a]
      const eyes = mid(a, b)
      const rawAngle = Math.atan2(b.y - a.y, b.x - a.x)
      const eyeDist = Math.hypot(b.x - a.x, b.y - a.y)
      const cx = fp.fx.filter(eyes.x, now)
      const cy = fp.fy.filter(eyes.y, now)
      const angle = fp.fa.filter(rawAngle, now)
      const dist = fp.fs.filter(eyeDist, now)
      const dx = cx - eyes.x
      const dy = cy - eyes.y
      const shift = (p: Vec2): Vec2 => ({ x: p.x + dx, y: p.y + dy })
      const yaw = yawFromMatrix(face.transform)
      const norm = (p: Vec2): Vec2 => ({
        x: (p.x - space.ox) / space.sx,
        y: (p.y - space.oy) / space.sy,
      })
      fp.pose = {
        anchors: {
          eyes: norm({ x: cx, y: cy }),
          cheeks: norm({ x: cx, y: cy }),
          forehead: norm(shift(px(lm[10]!))),
          nose: norm(shift(px(lm[1]!))),
          chin: norm(shift(px(lm[152]!))),
          mouth: norm(shift(mid(px(lm[61]!), px(lm[291]!)))),
        },
        angle,
        eyeDist: dist / space.unit,
        squash: Math.max(0.45, Math.cos(yaw)),
        lastSeen: now,
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D, space: StrokeSpace, now: number): void {
    if (!this.active.length) return
    for (const fp of this.faces) {
      const pose = fp.pose
      if (!pose) continue
      const age = now - pose.lastSeen
      const alpha = age <= 120 ? 1 : Math.max(0, 1 - (age - 120) / FADE_MS)
      if (alpha <= 0) {
        fp.pose = null
        fp.fx.reset()
        fp.fy.reset()
        fp.fa.reset()
        fp.fs.reset()
        continue
      }
      const eye = pose.eyeDist * space.unit
      for (const id of this.active) {
        const def = propDefs.find((p) => p.id === id)
        if (!def) continue
        const img = propImage(def)
        if (!img) continue
        const w = eye * def.scaleFactor * (def.yawSquash ? pose.squash : 1)
        const h = eye * def.scaleFactor * def.aspect
        const na = pose.anchors[def.anchor]
        const anchor = {
          x: na.x * space.sx + space.ox,
          y: na.y * space.sy + space.oy,
        }
        const c = Math.cos(pose.angle)
        const s = Math.sin(pose.angle)
        const ox = def.offset.x * eye
        const oy = def.offset.y * eye
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(anchor.x + ox * c - oy * s, anchor.y + ox * s + oy * c)
        ctx.rotate(pose.angle)
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }
  }

  reset(): void {
    this.faces = []
  }
}
