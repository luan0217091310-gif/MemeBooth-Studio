import type { EffectId, SoundId } from '@/types'

/** Where an effect originates. */
export type AnchorKind = 'hand' | 'head' | 'eyes' | 'mouth' | 'center' | 'top'

export interface EffectDef {
  id: EffectId
  /** Particle emitter preset + origin. */
  particles?: { preset: string; at: AnchorKind }[]
  /** Show the meme card (image + caption) near `memeAt`. */
  memeAt?: AnchorKind
  frame?: 'anime' | 'fire' | 'wave'
  shakeMs?: number
  flash?: boolean
  sound: SoundId
  /** Card lifetime in ms. */
  durationMs?: number
}

export const effects: Record<EffectId, EffectDef> = {
  'fx-top-roof': {
    id: 'fx-top-roof',
    memeAt: 'hand',
    particles: [{ preset: 'confetti', at: 'hand' }],
    sound: 'fanfare',
  },
  'fx-doomed': {
    id: 'fx-doomed',
    memeAt: 'head',
    particles: [{ preset: 'sweat', at: 'top' }],
    sound: 'slideDown',
  },
  'fx-determined': {
    id: 'fx-determined',
    memeAt: 'hand',
    frame: 'fire',
    particles: [{ preset: 'fire', at: 'hand' }],
    sound: 'whoosh',
  },
  'fx-love-all': {
    id: 'fx-love-all',
    memeAt: 'hand',
    particles: [{ preset: 'hearts', at: 'hand' }],
    sound: 'ting',
  },
  'fx-bye': {
    id: 'fx-bye',
    memeAt: 'hand',
    frame: 'wave',
    particles: [{ preset: 'bubbles', at: 'hand' }],
    sound: 'pop',
  },
  'fx-halo': {
    id: 'fx-halo',
    memeAt: 'head',
    particles: [{ preset: 'sparkles', at: 'head' }],
    sound: 'chime',
  },
  'fx-huh': {
    id: 'fx-huh',
    memeAt: 'head',
    particles: [{ preset: 'questions', at: 'head' }],
    sound: 'boing',
  },
  'fx-balloon': {
    id: 'fx-balloon',
    memeAt: 'head',
    particles: [{ preset: 'balloons', at: 'mouth' }],
    sound: 'pop',
  },
  'fx-kiss': {
    id: 'fx-kiss',
    memeAt: 'head',
    particles: [{ preset: 'kisses', at: 'mouth' }],
    sound: 'ting',
  },
  'fx-say-cheese': {
    id: 'fx-say-cheese',
    memeAt: 'hand',
    flash: true,
    particles: [{ preset: 'sparkles', at: 'hand' }],
    sound: 'shutter',
  },
  // Secret Ultra
  'fx-romance': {
    id: 'fx-romance',
    memeAt: 'head',
    frame: 'anime',
    particles: [
      { preset: 'heartRain', at: 'top' },
      { preset: 'hearts', at: 'hand' },
    ],
    sound: 'chime',
    durationMs: 3200,
  },
  'fx-idol': {
    id: 'fx-idol',
    memeAt: 'head',
    particles: [
      { preset: 'stars', at: 'eyes' },
      { preset: 'sparkles', at: 'eyes' },
    ],
    sound: 'sparkle',
    durationMs: 2800,
  },
  'fx-shock': {
    id: 'fx-shock',
    memeAt: 'head',
    shakeMs: 400,
    particles: [{ preset: 'rainbow', at: 'mouth' }],
    sound: 'boing',
    durationMs: 2600,
  },
}
