import { faceConfig } from '@/config/gestures'
import type { DerivedId, PerceptionSnapshot, Vec2 } from '@/types'
import { dist, handSize } from './handGestures'

/** Hysteresis latch turned into a 0..1 score (>= 0.6 while active). */
function latchScore(
  v: number,
  enter: number,
  exit: number,
  prev: boolean,
): [number, boolean] {
  const on = prev ? v >= exit : v > enter
  const score = on
    ? 0.6 +
      0.4 * Math.min(1, Math.max(0, (v - exit) / Math.max(1e-3, 1 - exit)))
    : 0.5 * Math.min(1, Math.max(0, v / enter))
  return [score, on]
}

/** Two-hand heart: thumb tips touch below, index tips touch above, roughly symmetric. */
export function heartScore(
  a: readonly Vec2[],
  b: readonly Vec2[],
  aspect = 1,
): number {
  if (a.length < 21 || b.length < 21) return 0
  const size = (handSize(a, aspect) + handSize(b, aspect)) / 2
  const thumbs = dist(a[4]!, b[4]!, aspect) / size
  const index = dist(a[8]!, b[8]!, aspect) / size
  const indexY = (a[8]!.y + b[8]!.y) / 2
  const thumbY = (a[4]!.y + b[4]!.y) / 2
  const above = indexY < thumbY - 0.2 * size ? 1 : 0
  const midIndex = (a[8]!.x + b[8]!.x) / 2
  const midThumb = (a[4]!.x + b[4]!.x) / 2
  const sym = Math.abs(midIndex - midThumb) / size
  const t = faceConfig.heartTouch
  const close = (d: number) =>
    Math.min(1, Math.max(0, (t * 1.6 - d) / (t * 0.6)))
  return Math.min(close(thumbs), close(index), above, sym < 0.6 ? 1 : 0)
}

/**
 * Computes derived signals (face expressions, two-hand heart) with EMA and
 * hysteresis, writing them into `snapshot.derived`.
 */
export class DerivedTracker {
  private ema = new Map<string, number>()
  private latches = new Map<DerivedId, boolean>()

  private smooth(key: string, v: number): number {
    const prev = this.ema.get(key)
    const next = prev === undefined ? v : prev + faceConfig.alpha * (v - prev)
    this.ema.set(key, next)
    return next
  }

  private latch(id: DerivedId, v: number, enter: number, exit: number): number {
    const [score, on] = latchScore(
      v,
      enter,
      exit,
      this.latches.get(id) ?? false,
    )
    this.latches.set(id, on)
    return score
  }

  update(snapshot: PerceptionSnapshot, aspect: number): void {
    const d = snapshot.derived
    const face = snapshot.faces[0]
    const c = faceConfig
    if (face && Object.keys(face.blendshapes).length) {
      const bs = (n: string) => this.smooth(n, face.blendshapes[n] ?? 0)
      const bl = bs('eyeBlinkLeft')
      const br = bs('eyeBlinkRight')
      const winkRaw =
        Math.abs(bl - br) > c.winkDiff && Math.min(bl, br) < c.winkOther ? 1 : 0
      d.WINK = this.latch('WINK', this.smooth('wink', winkRaw), 0.6, 0.4)
      d.MOUTH_OPEN = this.latch(
        'MOUTH_OPEN',
        bs('jawOpen'),
        c.mouthOpen.enter,
        c.mouthOpen.exit,
      )
      const smile = (bs('mouthSmileLeft') + bs('mouthSmileRight')) / 2
      d.SMILE = this.latch('SMILE', smile, c.smile.enter, c.smile.exit)
      d.PUCKER = this.latch(
        'PUCKER',
        bs('mouthPucker'),
        c.pucker.enter,
        c.pucker.exit,
      )
      d.BROW_UP = this.latch(
        'BROW_UP',
        bs('browInnerUp'),
        c.browUp.enter,
        c.browUp.exit,
      )
      d.CHEEK_PUFF = this.latch(
        'CHEEK_PUFF',
        bs('cheekPuff'),
        c.cheekPuff.enter,
        c.cheekPuff.exit,
      )
    } else {
      for (const id of [
        'WINK',
        'MOUTH_OPEN',
        'SMILE',
        'PUCKER',
        'BROW_UP',
        'CHEEK_PUFF',
      ] as const) {
        d[id] = 0
        this.latches.set(id, false)
      }
    }
    const [h1, h2] = snapshot.hands
    const heart = h1 && h2 ? heartScore(h1.landmarks, h2.landmarks, aspect) : 0
    d.HEART_TWO_HANDS = this.smooth('heart', heart)
  }

  reset(): void {
    this.ema.clear()
    this.latches.clear()
  }
}
