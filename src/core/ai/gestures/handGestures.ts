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
