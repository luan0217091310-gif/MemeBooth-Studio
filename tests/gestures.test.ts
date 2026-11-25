import { expect, it } from 'vitest'
import {
  classifyGeometry,
  classifyMemeGestures,
  dominant,
} from '@/core/ai/gestures/handGestures'
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
it('recognizes meme hand gestures via landmark geometry fusion', () => {
  // Open palm (all fingers + thumb open)
  const palm = classifyMemeGestures(handPose([true, true, true, true]))
  expect(palm.OPEN_PALM).toBeGreaterThan(0.75)

  // Victory (index + middle spread in a V)
  const vLm = handPose([true, true, false, false])
  vLm[8] = { x: 0.4, y: 0.48 }
  vLm[12] = { x: 0.53, y: 0.48 }
  const vic = classifyMemeGestures(vLm)
  expect(vic.VICTORY).toBeGreaterThan(0.75)

  // I Love You (index + pinky + thumb out)
  const ily = classifyMemeGestures(handPose([true, false, false, true]))
  expect(ily.I_LOVE_YOU).toBeGreaterThan(0.75)

  // Thumb up (4 fingers curled, thumb pointing straight up)
  const upLm = handPose([false, false, false, false])
  upLm[2] = { x: 0.41, y: 0.66 }
  upLm[3] = { x: 0.4, y: 0.59 }
  upLm[4] = { x: 0.39, y: 0.51 }
  const up = classifyMemeGestures(upLm)
  expect(up.THUMB_UP).toBeGreaterThan(0.7)
  expect(up.THUMB_DOWN).toBeLessThan(0.1)

  // Thumb down (4 fingers curled, thumb pointing straight down)
  const downLm = handPose([false, false, false, false])
  downLm[2] = { x: 0.41, y: 0.72 }
  downLm[3] = { x: 0.4, y: 0.79 }
  downLm[4] = { x: 0.39, y: 0.87 }
  const down = classifyMemeGestures(downLm)
  expect(down.THUMB_DOWN).toBeGreaterThan(0.7)
  expect(down.THUMB_UP).toBeLessThan(0.1)

  // Closed fist (4 fingers curled, thumb tucked against palm)
  const fistLm = handPose([false, false, false, false])
  fistLm[4] = { x: 0.46, y: 0.66 }
  const fist = classifyMemeGestures(fistLm)
  expect(fist.FIST).toBeGreaterThan(0.7)
})
