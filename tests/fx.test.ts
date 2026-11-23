import { expect, it } from 'vitest'
import { ParticlePool } from '@/core/canvas/particles/pool'
import { DerivedTracker, heartScore } from '@/core/ai/gestures/faceGestures'
import { yawFromMatrix } from '@/core/canvas/props/arProps'
import type { PerceptionSnapshot, Vec2 } from '@/types'
import { handPose } from './fixtures/handPose'

it('particle pool never grows and recycles the oldest slot', () => {
  const pool = new ParticlePool(4)
  for (let i = 0; i < 6; i++) pool.spawn(i, 0, 0, 0, 1, 1, 0)
  expect(pool.x.length).toBe(4)
  // Slots 0 and 1 were overwritten by particles 4 and 5.
  expect(Array.from(pool.x)).toEqual([4, 5, 2, 3])
  pool.update(0.5)
  expect(pool.alive).toBe(4)
  pool.update(0.6)
  expect(pool.alive).toBe(0)
})

function face(bs: Record<string, number>): PerceptionSnapshot {
  return {
    ts: 0,
    hands: [],
    faces: [{ landmarks: [], blendshapes: bs }],
    derived: {},
  }
}

it('wink differs from a full blink', () => {
  const t = new DerivedTracker()
  let s = face({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.1 })
  for (let i = 0; i < 20; i++) t.update(s, 1)
  expect(s.derived.WINK).toBeGreaterThan(0.6)
  const t2 = new DerivedTracker()
  s = face({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.85 })
  for (let i = 0; i < 20; i++) t2.update(s, 1)
  expect(s.derived.WINK).toBeLessThan(0.55)
})

it('mouth open uses hysteresis (enter 0.65, exit 0.5)', () => {
  const t = new DerivedTracker()
  const at = (v: number) => {
    const s = face({ jawOpen: v })
    for (let i = 0; i < 30; i++) t.update(s, 1)
    return s.derived.MOUTH_OPEN!
  }
  expect(at(0.6)).toBeLessThan(0.55)
  expect(at(0.8)).toBeGreaterThanOrEqual(0.6)
  expect(at(0.55)).toBeGreaterThanOrEqual(0.6)
  expect(at(0.4)).toBeLessThan(0.55)
})

it('detects a two-hand heart from geometry', () => {
  const a = handPose([true, false, false, false])
  const b = a.map((p) => ({ x: 1 - p.x, y: p.y }))
  // Move the index tips together on top and thumb tips together below.
  const shape = (h: Vec2[], dx: number) => {
    h[8] = { x: 0.5 + dx, y: 0.45 }
    h[4] = { x: 0.5 + dx, y: 0.7 }
    return h
  }
  expect(heartScore(shape(a, -0.01), shape(b, 0.01))).toBeGreaterThan(0.9)
  expect(heartScore(handPose([true, false, false, false]), b)).toBe(0)
})

it('reads yaw from a column-major transform matrix', () => {
  const yaw = 0.5
  const m = new Float32Array(16)
  m[0] = Math.cos(yaw)
  m[2] = -Math.sin(yaw)
  m[5] = 1
  m[8] = Math.sin(yaw)
  m[10] = Math.cos(yaw)
  m[15] = 1
  expect(yawFromMatrix(m)).toBeCloseTo(yaw, 5)
  expect(yawFromMatrix(undefined)).toBe(0)
})
