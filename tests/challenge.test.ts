import { describe, expect, it } from 'vitest'
import { builtinMemes } from '@/config/memes'
import {
  eligible,
  pickPrompts,
  scoreTurn,
  totalScore,
} from '@/core/challenge/game'
import type { MemeDef } from '@/types'

let seed = 7
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647

describe('prompt selection', () => {
  it('easy uses single triggers, hard uses combos', () => {
    expect(
      eligible(builtinMemes, 'easy').every((m) => m.trigger.all.length === 1),
    ).toBe(true)
    expect(
      eligible(builtinMemes, 'hard').every((m) => m.trigger.all.length >= 2),
    ).toBe(true)
  })
  it('picks 5 prompts without immediate repeats', () => {
    const p = pickPrompts(builtinMemes, 'easy', 5, rng)
    expect(p).toHaveLength(5)
    expect(new Set(p.map((m) => m.id)).size).toBe(5)
  })
  it('cycles a small pool but never repeats back-to-back', () => {
    const p = pickPrompts(builtinMemes, 'hard', 7, rng)
    expect(p).toHaveLength(7)
    for (let i = 1; i < p.length; i++) expect(p[i]!.id).not.toBe(p[i - 1]!.id)
  })
  it('includes custom memes flagged for the challenge, skips others', () => {
    const custom = {
      ...builtinMemes[3]!,
      id: 'c1',
      source: 'custom',
      includeInChallenge: true,
    } as MemeDef
    const hidden = {
      ...builtinMemes[4]!,
      id: 'c2',
      source: 'custom',
      includeInChallenge: false,
    } as MemeDef
    const ids = eligible([custom, hidden], 'easy').map((m) => m.id)
    expect(ids).toEqual(['c1'])
  })
  it('returns no prompts when nothing is eligible', () => {
    expect(pickPrompts([], 'easy')).toEqual([])
  })
})

describe('scoring', () => {
  it('rewards accuracy and speed', () => {
    expect(scoreTurn(true, 1, 0, 0).points).toBe(150)
    expect(scoreTurn(true, 1, 5000, 0).points).toBe(100)
    expect(scoreTurn(true, 0.8, 2500, 0).points).toBe(100)
  })
  it('adds a streak bonus and resets it on a miss', () => {
    const a = scoreTurn(true, 1, 5000, 0)
    const b = scoreTurn(true, 1, 5000, a.streak)
    expect(b.points).toBe(120)
    const miss = scoreTurn(false, 0.9, 1000, b.streak)
    expect(miss).toEqual({ points: 0, streak: 0 })
    expect(
      totalScore([
        {
          memeId: 'a',
          hit: true,
          match: 1,
          elapsedMs: 0,
          points: a.points,
          streak: 1,
        },
        {
          memeId: 'b',
          hit: true,
          match: 1,
          elapsedMs: 0,
          points: b.points,
          streak: 2,
        },
      ]),
    ).toBe(220)
  })
})
