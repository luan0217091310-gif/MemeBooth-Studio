export const challengeConfig = {
  /** Turns per round (configurable). */
  turns: 5,
  /** Seconds to perform each prompt. */
  turnSeconds: 5,
  /** Pause between turns (ms). */
  betweenMs: 1600,
  /** Bonus points per consecutive success (streak 2 = +20, 3 = +40...). */
  streakBonus: 20,
  /** Max speed multiplier for an instant match (linear down to 1x). */
  speedMax: 1.5,
}

export type Difficulty = 'easy' | 'hard'
