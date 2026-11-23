import { afterEach, expect, it } from 'vitest'
import { PerceptionTracker } from '@/core/ai/perception'
import { setMirror } from '@/core/ai/toDisplay'
import type { RawResult } from '@/core/ai/protocol'

function hand(
  x: number,
  y: number,
  label = 'Left',
  gesture = 'Victory',
): RawResult['hands'] {
  const lm = new Float32Array(42)
  for (let i = 0; i < 21; i++) {
    lm[i * 2] = x
    lm[i * 2 + 1] = y
  }
  return [
    {
      landmarks: lm,
      handedness: label,
      gestures: [{ name: gesture, score: 0.9 }],
    },
  ]
}

afterEach(() => setMirror(true))

it('converts to mirrored display space exactly once and normalizes handedness', () => {
  const t = new PerceptionTracker()
  t.ingest({ ts: 0, hands: hand(0.2, 0.4), inferenceMs: 5 })
  const s = t.sample(0)
  expect(s.hands).toHaveLength(1)
  expect(s.hands[0]!.landmarks[8]!.x).toBeCloseTo(0.8)
  expect(s.hands[0]!.landmarks[8]!.y).toBeCloseTo(0.4)
  // Raw "Left" on an un-mirrored selfie frame is the person's right hand.
  expect(s.hands[0]!.handedness).toBe('Right')
  expect(s.hands[0]!.gestures.VICTORY).toBeCloseTo(0.9)
})

it('interpolates between snapshots and keeps the hand through short dropouts', () => {
  const t = new PerceptionTracker()
  t.setParams({ minCutoff: 1000, beta: 0 }) // effectively no smoothing
  t.ingest({ ts: 0, hands: hand(0.0, 0.5), inferenceMs: 5 })
  t.ingest({ ts: 60, hands: hand(0.6, 0.5), inferenceMs: 5 })
  const mid = t.sample(90)
  const x = mid.hands[0]!.landmarks[0]!.x
  // Mirrored: raw 0 -> 1, raw 0.6 -> 0.4; midway lies strictly between.
  expect(x).toBeLessThan(0.95)
  expect(x).toBeGreaterThan(0.45)
  // Within 300 ms grace the hand remains.
  t.ingest({ ts: 120, faces: [], inferenceMs: 5 })
  expect(t.sample(300).hands).toHaveLength(1)
  // Long after, it is dropped.
  expect(t.sample(1000).hands).toHaveLength(0)
})

it('respects the mirror setting', () => {
  setMirror(false)
  const t = new PerceptionTracker()
  t.ingest({ ts: 0, hands: hand(0.2, 0.4), inferenceMs: 5 })
  expect(t.sample(0).hands[0]!.landmarks[0]!.x).toBeCloseTo(0.2)
})
