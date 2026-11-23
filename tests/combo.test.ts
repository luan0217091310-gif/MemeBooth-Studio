import { describe, expect, it } from 'vitest'
import {
  createComboState,
  stepCombo,
  SUBSET_DEFER_MS,
} from '@/core/ai/combo/engine'
import { builtinMemes } from '@/config/memes'
import type {
  DerivedId,
  HandGestureId,
  PerceptionSnapshot,
  TriggerRule,
} from '@/types'

function snap(
  hand: Partial<Record<HandGestureId, number>> | null,
  derived: Partial<Record<DerivedId, number>> = {},
): PerceptionSnapshot {
  return {
    ts: 0,
    hands: hand ? [{ landmarks: [], handedness: 'Right', gestures: hand }] : [],
    faces: [],
    derived,
  }
}

/** Runs a constant input for `ms` at 60 fps and collects fired rule ids. */
function run(
  rules: TriggerRule[],
  frames: [PerceptionSnapshot, number][],
  mode: 'draw' | 'meme' = 'meme',
) {
  const state = createComboState()
  const fired: { id: string; t: number }[] = []
  let t = 0
  for (const [s, ms] of frames)
    for (let e = 0; e < ms; e += 16) {
      t += 16
      for (const f of stepCombo(state, rules, s, t, mode).fired)
        fired.push({ id: f.ruleId, t })
    }
  return fired
}

const thumb: TriggerRule = {
  id: 'thumb',
  all: [{ kind: 'hand', gesture: 'THUMB_UP' }],
  holdMs: 300,
  cooldownMs: 2000,
  priority: 1,
  effect: 'a',
}
const mouth: TriggerRule = {
  id: 'mouth',
  all: [{ kind: 'derived', id: 'MOUTH_OPEN' }],
  holdMs: 300,
  cooldownMs: 2000,
  priority: 60,
  effect: 'b',
}
const huh: TriggerRule = {
  id: 'huh',
  all: [
    { kind: 'derived', id: 'BROW_UP' },
    { kind: 'derived', id: 'MOUTH_OPEN' },
  ],
  holdMs: 250,
  cooldownMs: 2000,
  priority: 70,
  effect: 'c',
}
const victory: TriggerRule = {
  id: 'v',
  all: [{ kind: 'hand', gesture: 'VICTORY' }],
  holdMs: 0,
  cooldownMs: 2000,
  priority: 20,
  effect: 'd',
}
const idol: TriggerRule = {
  id: 'idol',
  all: [
    { kind: 'hand', gesture: 'VICTORY' },
    { kind: 'derived', id: 'WINK' },
  ],
  windowMs: 500,
  holdMs: 0,
  cooldownMs: 2000,
  priority: 100,
  effect: 'e',
}

describe('combo engine', () => {
  it('fires only after the hold time', () => {
    expect(run([thumb], [[snap({ THUMB_UP: 0.9 }), 250]])).toHaveLength(0)
    expect(run([thumb], [[snap({ THUMB_UP: 0.9 }), 400]])).toHaveLength(1)
  })
  it('respects cooldown while the gesture is held', () => {
    const fired = run([thumb], [[snap({ THUMB_UP: 0.9 }), 5000]])
    expect(fired.length).toBe(3)
    expect(fired[1]!.t - fired[0]!.t).toBeGreaterThanOrEqual(2000)
  })
  it('never fires on a neutral, still person (60 s)', () => {
    const rules = builtinMemes.map((m) => m.trigger)
    expect(
      run(rules, [
        [
          snap(
            { THUMB_UP: 0.1, OPEN_PALM: 0.2 },
            { SMILE: 0.3, MOUTH_OPEN: 0.1 },
          ),
          60_000,
        ],
      ]),
    ).toHaveLength(0)
  })
  it('combo beats its single subset rule', () => {
    const fired = run(
      [mouth, huh],
      [[snap(null, { BROW_UP: 0.9, MOUTH_OPEN: 0.9 }), 600]],
    )
    expect(fired.map((f) => f.id)).toEqual(['huh'])
  })
  it('defers the subset while a combo is building, then lets it fire', () => {
    // Only mouth open: the combo never completes; mouth fires after hold.
    const fired = run([mouth, huh], [[snap(null, { MOUTH_OPEN: 0.9 }), 800]])
    expect(fired.map((f) => f.id)).toEqual(['mouth'])
  })
  it('window combo: VICTORY then WINK within 500 ms fires Idol, not plain VICTORY', () => {
    const fired = run(
      [victory, idol],
      [
        [snap({ VICTORY: 0.9 }), 160],
        [snap({ VICTORY: 0.9 }, { WINK: 0.9 }), 64],
      ],
    )
    expect(fired.map((f) => f.id)).toEqual(['idol'])
  })
  it('plain VICTORY still fires once the deferral elapses', () => {
    const fired = run(
      [victory, idol],
      [[snap({ VICTORY: 0.9 }), SUBSET_DEFER_MS + 200]],
    )
    expect(fired.map((f) => f.id)).toEqual(['v'])
  })
  it('draw mode only lets face expressions through', () => {
    expect(run([thumb], [[snap({ THUMB_UP: 0.9 }), 600]], 'draw')).toHaveLength(
      0,
    )
    expect(
      run([mouth], [[snap(null, { MOUTH_OPEN: 0.9 }), 600]], 'draw'),
    ).toHaveLength(1)
  })
  it('ships 10 regular triggers and 3 secret ultra memes', () => {
    expect(builtinMemes.filter((m) => m.id.startsWith('ultra-'))).toHaveLength(
      3,
    )
    expect(
      builtinMemes.filter((m) => !m.id.startsWith('ultra-')).length,
    ).toBeGreaterThanOrEqual(10)
  })
})
