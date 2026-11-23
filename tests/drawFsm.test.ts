import { describe, expect, it } from 'vitest'
import {
  initialFsm,
  stepDraw,
  type DrawFsm,
  type DrawInput,
} from '@/core/interaction/drawFsm'
import type { DominantGesture } from '@/core/ai/gestures/handGestures'

function run(seq: [DominantGesture, number][], extra: Partial<DrawInput> = {}) {
  let s: DrawFsm = initialFsm(0)
  const events: string[] = []
  let t = 0
  for (const [g, ms] of seq) {
    for (let e = 0; e < ms; e += 16) {
      t += 16
      s = stepDraw(
        s,
        {
          gesture: g,
          present: true,
          grabHit: false,
          allowDraw: true,
          ...extra,
        },
        t,
      )
      events.push(...s.events)
    }
  }
  return { s, events }
}

describe('draw FSM', () => {
  it('lowers the pen only after POINT is stable for 120 ms', () => {
    expect(run([['POINT', 96]]).s.state).toBe('hover')
    const r = run([['POINT', 200]])
    expect(r.s.state).toBe('drawing')
    expect(r.events).toEqual(['strokeStart'])
  })
  it('ignores a brief gesture flicker while drawing (pen-up hysteresis)', () => {
    const r = run([
      ['POINT', 200],
      ['NONE', 32],
      ['POINT', 100],
    ])
    expect(r.events).toEqual(['strokeStart'])
    expect(r.s.state).toBe('drawing')
  })
  it('lifts the pen when the gesture changes for real, without a stray stroke', () => {
    const r = run([
      ['POINT', 200],
      ['TWO_FINGER', 300],
    ])
    expect(r.events).toEqual(['strokeStart', 'strokeEnd', 'eraseStart'])
    expect(r.s.state).toBe('erasing')
  })
  it('clears only after holding OPEN_PALM for 2 s, and only once', () => {
    expect(run([['OPEN_PALM', 1500]]).events).not.toContain('clear')
    const mid = run([['OPEN_PALM', 800]])
    expect(mid.s.state).toBe('paused')
    const r = run([['OPEN_PALM', 4000]])
    expect(r.events.filter((e) => e === 'clear')).toHaveLength(1)
  })
  it('grabs only when PINCH hits an item', () => {
    expect(run([['PINCH', 200]]).s.state).toBe('hover')
    const r = run(
      [
        ['PINCH', 200],
        ['POINT', 16],
      ],
      { grabHit: true },
    )
    expect(r.events).toEqual(['grabStart', 'grabEnd'])
  })
  it('meme mode never draws or erases', () => {
    const r = run(
      [
        ['POINT', 300],
        ['TWO_FINGER', 300],
        ['OPEN_PALM', 2500],
      ],
      { allowDraw: false },
    )
    expect(r.events).toEqual([])
  })
  it('ends the stroke when the hand disappears', () => {
    let s = run([['POINT', 200]]).s
    s = stepDraw(
      s,
      { gesture: 'NONE', present: false, grabHit: false, allowDraw: true },
      10_000,
    )
    expect(s.events).toEqual(['strokeEnd'])
    expect(s.state).toBe('idle')
  })
})
