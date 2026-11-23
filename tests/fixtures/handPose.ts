import type { Vec2 } from '@/types'

/** Synthetic upright hand in display space. Fingers: index, middle, ring, pinky. */
export function handPose(
  extended: [boolean, boolean, boolean, boolean],
  opts: { pinch?: boolean } = {},
): Vec2[] {
  const lm: Vec2[] = new Array(21)
  lm[0] = { x: 0.5, y: 0.8 }
  const xs = [0.44, 0.49, 0.54, 0.59]
  xs.forEach((x, f) => {
    const base = 5 + f * 4
    const up = extended[f]
    lm[base] = { x, y: 0.65 }
    lm[base + 1] = { x, y: 0.58 }
    lm[base + 2] = { x, y: up ? 0.53 : 0.62 }
    lm[base + 3] = { x, y: up ? 0.48 : 0.66 }
  })
  lm[1] = { x: 0.44, y: 0.76 }
  lm[2] = { x: 0.4, y: 0.71 }
  lm[3] = { x: 0.37, y: 0.67 }
  lm[4] = opts.pinch ? { ...lm[8]! } : { x: 0.35, y: 0.63 }
  return lm
}
