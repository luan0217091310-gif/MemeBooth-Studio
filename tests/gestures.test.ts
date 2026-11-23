import { expect, it } from 'vitest'
import { classifyGeometry, dominant } from '@/core/ai/gestures/handGestures'
import type { HandGestureId } from '@/types'
import { handPose } from './fixtures/handPose'

function classify(lm: ReturnType<typeof handPose>, pinch = false) {
  const out: Partial<Record<HandGestureId, number>> = {}
  classifyGeometry(lm, { pinch }, out)
  return out
}

it('detects POINT', () => {
  const g = classify(handPose([true, false, false, false]))
  expect(g.POINT).toBeGreaterThan(0.9)
  expect(dominant(g)).toBe('POINT')
})
it('detects TWO_FINGER and not POINT', () => {
  const g = classify(handPose([true, true, false, false]))
  expect(dominant(g)).toBe('TWO_FINGER')
  expect(g.POINT).toBeLessThan(0.1)
})
it('detects PINCH with hysteresis', () => {
  expect(
    dominant(classify(handPose([true, false, false, false], { pinch: true }))),
  ).toBe('PINCH')
  // Thumb tip 0.3 handSize away: outside enter (0.25) but inside exit (0.35).
  const lm = handPose([true, false, false, false])
  lm[4] = { x: lm[8]!.x - 0.045, y: lm[8]!.y }
  expect(classify(lm, false).PINCH).toBe(0)
  expect(classify(lm, true).PINCH).toBe(1)
})
it('a fist is none of the geometry gestures', () => {
  const g = classify(handPose([false, false, false, false]))
  expect(dominant(g)).toBe('NONE')
})
