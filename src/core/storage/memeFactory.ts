import type { Condition, MemeDef, SoundId, TriggerRule } from '@/types'

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const IMAGE_MAX_EDGE = 1024
export const AUDIO_MAX_BYTES = 1024 * 1024
export const AUDIO_MAX_SECONDS = 5

export type ImageCheck = 'ok' | 'type' | 'size'
export function checkImage(type: string, size: number): ImageCheck {
  if (!IMAGE_TYPES.includes(type)) return 'type'
  if (size > IMAGE_MAX_BYTES) return 'size'
  return 'ok'
}

export type AudioCheck = 'ok' | 'size' | 'duration'
export function checkAudio(size: number, durationSec: number): AudioCheck {
  if (size > AUDIO_MAX_BYTES) return 'size'
  if (durationSec > AUDIO_MAX_SECONDS + 0.05) return 'duration'
  return 'ok'
}

/** Fit inside a long edge without upscaling. */
export function fitSize(w: number, h: number, maxEdge = IMAGE_MAX_EDGE) {
  const k = Math.min(1, maxEdge / Math.max(w, h))
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

export interface TriggerOption {
  id: string
  conditions: Condition[]
  windowMs?: number
  holdMs: number
  combo: boolean
}

/** Triggers a user can pick in the creator (singles and combos). */
export const triggerOptions: TriggerOption[] = [
  ...(
    [
      'THUMB_UP',
      'THUMB_DOWN',
      'FIST',
      'I_LOVE_YOU',
      'OPEN_PALM',
      'VICTORY',
    ] as const
  ).map((g): TriggerOption => ({
    id: 'hand:' + g,
    conditions: [{ kind: 'hand', gesture: g }],
    holdMs: g === 'OPEN_PALM' ? 600 : 400,
    combo: false,
  })),
  ...(
    [
      'SMILE',
      'WINK',
      'MOUTH_OPEN',
      'PUCKER',
      'BROW_UP',
      'CHEEK_PUFF',
      'HEART_TWO_HANDS',
    ] as const
  ).map((d): TriggerOption => ({
    id: 'derived:' + d,
    conditions: [{ kind: 'derived', id: d }],
    holdMs: d === 'HEART_TWO_HANDS' ? 400 : 350,
    combo: false,
  })),
  {
    id: 'combo:VICTORY+WINK',
    conditions: [
      { kind: 'hand', gesture: 'VICTORY' },
      { kind: 'derived', id: 'WINK' },
    ],
    windowMs: 500,
    holdMs: 0,
    combo: true,
  },
  {
    id: 'combo:BROW_UP+MOUTH_OPEN',
    conditions: [
      { kind: 'derived', id: 'BROW_UP' },
      { kind: 'derived', id: 'MOUTH_OPEN' },
    ],
    holdMs: 250,
    combo: true,
  },
  {
    id: 'combo:SMILE+THUMB_UP',
    conditions: [
      { kind: 'derived', id: 'SMILE' },
      { kind: 'hand', gesture: 'THUMB_UP' },
    ],
    holdMs: 350,
    combo: true,
  },
]

const key = (c: Condition) =>
  c.kind === 'hand'
    ? 'h:' + c.gesture
    : c.kind === 'derived'
      ? 'd:' + c.id
      : 'f:' + c.blendshape

/** Existing rules with exactly the same condition set. */
export function findDuplicates(
  rules: readonly TriggerRule[],
  conditions: Condition[],
): TriggerRule[] {
  const want = conditions.map(key).sort().join('|')
  return rules.filter((r) => r.all.map(key).sort().join('|') === want)
}

export const PRIORITIES = { low: 10, normal: 30, high: 80 } as const

export function buildCustomMeme(input: {
  id: string
  name: string
  top: string
  bottom: string
  option: TriggerOption
  priority: number
  soundId: SoundId
  includeInChallenge: boolean
}): MemeDef {
  const { option } = input
  return {
    id: input.id,
    source: 'custom',
    name: input.name.trim() || 'Meme của tôi',
    caption: {
      top: input.top.trim() || undefined,
      bottom: input.bottom.trim() || undefined,
    },
    visual: { kind: 'image', blobKey: input.id },
    soundId: input.soundId,
    fx: ['fx-custom'],
    trigger: {
      id: input.id,
      all: option.conditions,
      windowMs: option.windowMs,
      holdMs: option.holdMs,
      cooldownMs: 2500,
      priority: input.priority,
      effect: 'fx-custom',
    },
    includeInChallenge: input.includeInChallenge,
  }
}
