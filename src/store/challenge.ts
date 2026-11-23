import { create } from 'zustand'
import type { Difficulty } from '@/config/challenges'
import type { TurnResult } from '@/core/challenge/game'
import type { MemeDef } from '@/types'

export type ChallengePhase =
  'idle' | 'intro' | 'turn' | 'between' | 'scoreboard'

interface ChallengeState {
  phase: ChallengePhase
  difficulty: Difficulty
  prompts: MemeDef[]
  index: number
  turnStartedAt: number
  /** Live match score of the current prompt (0..1), <= 10 Hz. */
  live: number
  results: TurnResult[]
  total: number
  best: number
  /** Object URL of the challenge photo strip (revoked on close). */
  stripUrl: string | null
  strip: Blob | null
  set(p: Partial<Omit<ChallengeState, 'set'>>): void
}

const BEST_KEY = 'memebooth.bestScore'
function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}
export function saveBest(n: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(n))
  } catch {
    /* non-essential */
  }
}

export const useChallenge = create<ChallengeState>((set) => ({
  phase: 'idle',
  difficulty: 'easy',
  prompts: [],
  index: 0,
  turnStartedAt: 0,
  live: 0,
  results: [],
  total: 0,
  best: loadBest(),
  stripUrl: null,
  strip: null,
  set: (p) => set(p),
}))
