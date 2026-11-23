import { challengeConfig, type Difficulty } from '@/config/challenges'
import type { MemeDef } from '@/types'

/** Prompts come from every meme flagged includeInChallenge (custom ones too). */
export function eligible(
  memes: readonly MemeDef[],
  difficulty: Difficulty,
): MemeDef[] {
  return memes.filter(
    (m) =>
      m.includeInChallenge &&
      (difficulty === 'easy'
        ? m.trigger.all.length === 1
        : m.trigger.all.length >= 2),
  )
}

/**
 * Picks `n` prompts. Avoids repeats while possible; when the pool is smaller
 * than n it cycles (never two identical prompts in a row).
 */
export function pickPrompts(
  memes: readonly MemeDef[],
  difficulty: Difficulty,
  n = challengeConfig.turns,
  rng: () => number = Math.random,
): MemeDef[] {
  let pool = eligible(memes, difficulty)
  // Hard mode with too few combos borrows singles so a round can still run.
  if (difficulty === 'hard' && pool.length < 2)
    pool = [...pool, ...eligible(memes, 'easy')]
  if (!pool.length) return []
  const out: MemeDef[] = []
  let bag: MemeDef[] = []
  while (out.length < n) {
    if (!bag.length) {
      bag = [...pool]
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
      }
      if (bag.length > 1 && bag[bag.length - 1] === out[out.length - 1])
        bag.reverse()
    }
    out.push(bag.pop()!)
  }
  return out
}

export interface TurnResult {
  memeId: string
  hit: boolean
  /** Smoothed trigger score 0..1 at the moment of match (or best seen). */
  match: number
  elapsedMs: number
  points: number
  streak: number
}

/**
 * Score = match (0-100) x speed factor (1.5 instant -> 1.0 at the deadline),
 * plus a streak bonus for consecutive successes. Misses score 0.
 */
export function scoreTurn(
  hit: boolean,
  match: number,
  elapsedMs: number,
  prevStreak: number,
  turnMs = challengeConfig.turnSeconds * 1000,
): { points: number; streak: number } {
  if (!hit) return { points: 0, streak: 0 }
  const m = Math.max(0, Math.min(1, match)) * 100
  const t = Math.max(0, Math.min(1, elapsedMs / turnMs))
  const speed = challengeConfig.speedMax - (challengeConfig.speedMax - 1) * t
  const streak = prevStreak + 1
  const bonus = (streak - 1) * challengeConfig.streakBonus
  return { points: Math.round(m * speed) + bonus, streak }
}

export function totalScore(results: readonly TurnResult[]): number {
  return results.reduce((s, r) => s + r.points, 0)
}
