import type { SoundId } from '@/types'
import { getBus, isMuted } from './engine'
import * as s from './synths'

type Entry =
  { kind: 'synth'; synth: s.Synth } | { kind: 'buffer'; buffer: AudioBuffer }

const registry = new Map<SoundId, Entry>()
const MAX_VOICES = 8
const voices: number[] = [] // end times in AudioContext seconds

export function registerSynth(id: SoundId, synth: s.Synth): void {
  registry.set(id, { kind: 'synth', synth })
}
/** Swap in a real recording: same id, buffer instead of synth. */
export function registerBuffer(id: SoundId, buffer: AudioBuffer): void {
  registry.set(id, { kind: 'buffer', buffer })
}
export function hasSound(id: SoundId): boolean {
  return registry.has(id)
}

const builtins: Record<string, s.Synth> = {
  ting: s.ting,
  pop: s.pop,
  whoosh: s.whoosh,
  boing: s.boing,
  fanfare: s.fanfare,
  shutter: s.shutter,
  beep: s.beep,
  sparkle: s.sparkle,
  chime: s.chime,
  pageFlip: s.pageFlip,
  slideDown: s.slideDown,
  zap: s.zap,
  horn: s.horn,
  scratch: s.scratch,
  blip8bit: s.blip8bit,
  'bgm-kawaii': s.bgmLoop([523, 659, 784, 880, 1047], 104),
  'bgm-y2k': s.bgmLoop([440, 554, 659, 831, 880], 124),
  'bgm-chaotic': s.bgmLoop([196, 233, 262, 311, 392], 136),
  'bgm-neon': s.bgmLoop([220, 262, 330, 392, 494], 118),
}
for (const [id, synth] of Object.entries(builtins)) registerSynth(id, synth)

/** Per-vibe substitutions (e.g. Y2K plays 8-bit blips instead of pop). */
let packMap: Record<string, SoundId> = {}
export function setSoundPack(map: Record<string, SoundId>): void {
  packMap = map
}

/** Active voice count (for tests / debug). */
export function activeVoices(): number {
  const bus = getBus()
  if (!bus) return 0
  const now = bus.ctx.currentTime
  while (voices.length && voices[0]! <= now) voices.shift()
  return voices.length
}

/**
 * Plays a sound through the master bus (speakers + recording).
 * Drops the request when 8 voices are already active.
 */
export function playSound(
  id: SoundId,
  params?: s.SynthParams,
  dest?: AudioNode,
): boolean {
  const bus = getBus()
  if (!bus || isMuted()) return false
  const entry = registry.get(packMap[id] ?? id) ?? registry.get(id)
  if (!entry) return false
  if (activeVoices() >= MAX_VOICES) return false
  const now = bus.ctx.currentTime
  const out = dest ?? bus.master
  let dur: number
  if (entry.kind === 'synth')
    dur = entry.synth(bus.ctx, out, now + 0.005, params)
  else {
    const src = bus.ctx.createBufferSource()
    src.buffer = entry.buffer
    const gain = bus.ctx.createGain()
    gain.gain.value = params?.gain ?? 1
    src.connect(gain).connect(out)
    src.start(now + 0.005)
    dur = entry.buffer.duration
  }
  voices.push(now + dur)
  voices.sort((a, b) => a - b)
  return true
}
