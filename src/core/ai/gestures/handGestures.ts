import { gestureConfig } from '@/config/gestures'
import type { HandGestureId, Vec2 } from '@/types'

/** Squared-aspect-aware distance: x and y are scaled to the same pixel unit. */
export function dist(a: Vec2, b: Vec2, aspect = 1): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * aspect)
}

/** Distance wrist(0) -> middle MCP(9); all hand distances are divided by it. */
export function handSize(lm: readonly Vec2[], aspect = 1): number {
  return Math.max(1e-4, dist(lm[0]!, lm[9]!, aspect))
}

/** 1 when the finger is clearly extended, 0 when clearly curled. */
export function extension(
  lm: readonly Vec2[],
  tip: number,
  pip: number,
  aspect = 1,
): number {
  const w = lm[0]!
  const ratio =
    dist(lm[tip]!, w, aspect) / Math.max(1e-4, dist(lm[pip]!, w, aspect))
  const { curled, extended } = gestureConfig.fingerRatio
  return Math.min(1, Math.max(0, (ratio - curled) / (extended - curled)))
}

export interface GeometryState {
  pinch: boolean
}

/**
 * Landmark-geometry gestures that MediaPipe does not provide:
 * POINT, PINCH (with hysteresis) and TWO_FINGER. Mutates `out`.
 */
export function classifyGeometry(
  lm: readonly Vec2[],
  state: GeometryState,
  out: Partial<Record<HandGestureId, number>>,
  aspect = 1,
  /** Smoothed MediaPipe `Pointing_Up` score, used as a secondary signal. */
  pointingUp = 0,
): void {
  if (lm.length < 21) return
  const size = handSize(lm, aspect)
  const pinchD = dist(lm[4]!, lm[8]!, aspect) / size
  const { pinchEnter, pinchExit } = gestureConfig
  state.pinch = state.pinch ? pinchD < pinchExit : pinchD < pinchEnter
  const index = extension(lm, 8, 6, aspect)
  const middle = extension(lm, 12, 10, aspect)
  const ring = extension(lm, 16, 14, aspect)
  const pinky = extension(lm, 20, 18, aspect)
  const othersCurled = 1 - Math.max(ring, pinky)
  out.PINCH = state.pinch ? 1 : 0
  const point = Math.min(index, 1 - middle, othersCurled)
  const two = Math.min(index, middle, othersCurled)
  // Pinch wins: the index tip is busy pinching, not pointing.
  out.POINT = state.pinch
    ? 0
    : Math.max(point, Math.min(pointingUp, 1 - middle))
  out.TWO_FINGER = state.pinch ? 0 : two
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Geometry-based recognition for meme hand gestures, fused with MediaPipe's
 * built-in GestureRecognizer so gestures stay responsive even at angles or
 * dim lighting where the neural classifier fluctuates.
 */
export function classifyMemeGestures(
  lm: readonly Vec2[],
  aspect = 1,
): Partial<Record<HandGestureId, number>> {
  const out: Partial<Record<HandGestureId, number>> = {}
  if (lm.length < 21) return out
  const size = handSize(lm, aspect)
  const index = extension(lm, 8, 6, aspect)
  const middle = extension(lm, 12, 10, aspect)
  const ring = extension(lm, 16, 14, aspect)
  const pinky = extension(lm, 20, 18, aspect)

  const allFourExtended = Math.min(index, middle, ring, pinky)
  const allFourCurled = 1 - Math.max(index, middle, ring, pinky)

  // Thumb geometry relative to palm & index knuckle.
  const thumbSpan = dist(lm[4]!, lm[5]!, aspect) / size
  const thumbAcross = dist(lm[4]!, lm[17]!, aspect) / size
  const thumbOut = clamp01((thumbSpan - 0.42) / 0.18)
  const thumbTucked = clamp01((0.72 - thumbSpan) / 0.25)

  // Vertical direction of thumb tip (y increases downward in display space).
  const dyTipToIp = (lm[3]!.y - lm[4]!.y) * aspect
  const dyTipToIndex = (lm[5]!.y - lm[4]!.y) * aspect
  const thumbUpDir = clamp01(
    Math.min(dyTipToIp / (0.18 * size), dyTipToIndex / (0.22 * size)),
  )
  const thumbDownDir = clamp01(
    Math.min(-dyTipToIp / (0.18 * size), -dyTipToIndex / (0.22 * size)),
  )

  // 👍 Thumb Up: 4 fingers curled, thumb clearly pointing up.
  out.THUMB_UP = Math.min(allFourCurled, thumbOut, thumbUpDir) * 0.9
  // 👎 Thumb Down: 4 fingers curled, thumb clearly pointing down.
  out.THUMB_DOWN = Math.min(allFourCurled, thumbOut, thumbDownDir) * 0.9
  // ✊ Fist: 4 fingers tightly curled, thumb not sticking vertically up/down.
  const thumbNeutral = 1 - Math.max(thumbUpDir, thumbDownDir)
  out.FIST = Math.min(allFourCurled, Math.max(thumbTucked, thumbNeutral * 0.85)) * 0.88
  // ✌️ Victory: index & middle extended, ring & pinky curled, slight V spread.
  const vSpread = dist(lm[8]!, lm[12]!, aspect) / size
  const spreadOk = clamp01((vSpread - 0.2) / 0.22)
  out.VICTORY =
    Math.min(index, middle, 1 - Math.max(ring, pinky), spreadOk) * 0.9
  // 🖐️ Open Palm: all 4 fingers extended and thumb open away from pinky base.
  const palmThumbOpen = clamp01((thumbAcross - 0.85) / 0.35)
  out.OPEN_PALM = Math.min(allFourExtended, palmThumbOpen) * 0.88
  // 🤟 I Love You: index + pinky extended, middle + ring curled, thumb out.
  out.I_LOVE_YOU =
    Math.min(index, pinky, 1 - Math.max(middle, ring), thumbOut) * 0.92

  return out
}

export type DominantGesture =
  'POINT' | 'PINCH' | 'TWO_FINGER' | 'OPEN_PALM' | 'NONE'

/** Picks the gesture that drives the draw FSM. */
export function dominant(
  g: Partial<Record<HandGestureId, number>>,
): DominantGesture {
  const t = gestureConfig.activeScore
  if ((g.PINCH ?? 0) >= 0.5) return 'PINCH'
  if ((g.TWO_FINGER ?? 0) >= t) return 'TWO_FINGER'
  if ((g.POINT ?? 0) >= t) return 'POINT'
  if ((g.OPEN_PALM ?? 0) >= t) return 'OPEN_PALM'
  return 'NONE'
}
