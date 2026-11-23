// Code-only synths: (ctx, destination, startTime, params) => duration (s).
export interface SynthParams {
  /** Pitch multiplier (1 = default). */
  pitch?: number
  gain?: number
}
export type Synth = (
  ctx: BaseAudioContext,
  dest: AudioNode,
  t: number,
  p?: SynthParams,
) => number

function env(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  g.connect(dest)
  return g
}

function tone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t: number,
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak = 0.3,
): void {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  o.connect(env(ctx, dest, t, peak, 0.005, dur))
  o.start(t)
  o.stop(t + dur + 0.05)
}

let noiseBuf: AudioBuffer | null = null
function noise(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t: number,
  dur: number,
  peak: number,
  filter?: { type: BiquadFilterType; f0: number; f1: number; q?: number },
): void {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  let node: AudioNode = src
  if (filter) {
    const f = ctx.createBiquadFilter()
    f.type = filter.type
    f.Q.value = filter.q ?? 1
    f.frequency.setValueAtTime(filter.f0, t)
    f.frequency.exponentialRampToValueAtTime(filter.f1, t + dur)
    src.connect(f)
    node = f
  }
  node.connect(env(ctx, dest, t, peak, 0.005, dur))
  src.start(t)
  src.stop(t + dur + 0.05)
}

const P = (x?: SynthParams) => x?.pitch ?? 1
const G = (x?: SynthParams) => x?.gain ?? 1

export const ting: Synth = (ctx, d, t, x) => {
  tone(ctx, d, t, 'sine', 1760 * P(x), 1740 * P(x), 0.5, 0.25 * G(x))
  tone(ctx, d, t, 'sine', 3520 * P(x), 3500 * P(x), 0.25, 0.08 * G(x))
  return 0.5
}
export const pop: Synth = (ctx, d, t, x) => {
  tone(ctx, d, t, 'sine', 900 * P(x), 180 * P(x), 0.09, 0.4 * G(x))
  return 0.1
}
export const whoosh: Synth = (ctx, d, t, x) => {
  noise(ctx, d, t, 0.45, 0.35 * G(x), {
    type: 'bandpass',
    f0: 300 * P(x),
    f1: 3000 * P(x),
    q: 2,
  })
  return 0.45
}
export const boing: Synth = (ctx, d, t, x) => {
  const o = ctx.createOscillator()
  o.type = 'triangle'
  const lfo = ctx.createOscillator()
  const lg = ctx.createGain()
  lfo.frequency.value = 14
  lg.gain.setValueAtTime(60, t)
  lg.gain.exponentialRampToValueAtTime(1, t + 0.6)
  lfo.connect(lg).connect(o.frequency)
  o.frequency.setValueAtTime(140 * P(x), t)
  o.frequency.exponentialRampToValueAtTime(320 * P(x), t + 0.6)
  o.connect(env(ctx, d, t, 0.35 * G(x), 0.01, 0.6))
  o.start(t)
  lfo.start(t)
  o.stop(t + 0.7)
  lfo.stop(t + 0.7)
  return 0.6
}
export const fanfare: Synth = (ctx, d, t, x) => {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => {
    const dur = i === 3 ? 0.5 : 0.12
    tone(ctx, d, t + i * 0.11, 'square', f * P(x), f * P(x), dur, 0.12 * G(x))
    tone(
      ctx,
      d,
      t + i * 0.11,
      'sawtooth',
      (f / 2) * P(x),
      (f / 2) * P(x),
      dur,
      0.05 * G(x),
    )
  })
  return 0.9
}
export const shutter: Synth = (ctx, d, t, x) => {
  noise(ctx, d, t, 0.04, 0.5 * G(x), { type: 'highpass', f0: 2000, f1: 4000 })
  noise(ctx, d, t + 0.07, 0.06, 0.35 * G(x), {
    type: 'bandpass',
    f0: 1500,
    f1: 900,
  })
  return 0.15
}
export const beep: Synth = (ctx, d, t, x) => {
  tone(ctx, d, t, 'square', 880 * P(x), 880 * P(x), 0.12, 0.12 * G(x))
  return 0.15
}
export const sparkle: Synth = (ctx, d, t, x) => {
  for (let i = 0; i < 6; i++) {
    const f = (1800 + ((i * 397) % 1600)) * P(x)
    tone(ctx, d, t + i * 0.05, 'sine', f, f * 1.02, 0.18, 0.1 * G(x))
  }
  return 0.5
}
export const chime: Synth = (ctx, d, t, x) => {
  const notes = [1047, 1319, 1568]
  notes.forEach((f, i) => {
    tone(ctx, d, t + i * 0.09, 'sine', f * P(x), f * P(x), 0.9, 0.12 * G(x))
    tone(
      ctx,
      d,
      t + i * 0.09,
      'triangle',
      f * 2 * P(x),
      f * 2 * P(x),
      0.4,
      0.03 * G(x),
    )
  })
  return 1.1
}
export const pageFlip: Synth = (ctx, d, t, x) => {
  noise(ctx, d, t, 0.22, 0.25 * G(x), {
    type: 'bandpass',
    f0: 1200 * P(x),
    f1: 4000 * P(x),
    q: 0.8,
  })
  return 0.25
}
export const slideDown: Synth = (ctx, d, t, x) => {
  tone(ctx, d, t, 'sawtooth', 440 * P(x), 110 * P(x), 0.7, 0.15 * G(x))
  return 0.7
}
export const zap: Synth = (ctx, d, t, x) => {
  tone(ctx, d, t, 'sawtooth', 2400 * P(x), 80 * P(x), 0.25, 0.18 * G(x))
  return 0.25
}
export const horn: Synth = (ctx, d, t, x) => {
  for (const dt of [0, 0.18]) {
    tone(ctx, d, t + dt, 'sawtooth', 466 * P(x), 440 * P(x), 0.16, 0.15 * G(x))
    tone(ctx, d, t + dt, 'square', 233 * P(x), 220 * P(x), 0.16, 0.08 * G(x))
  }
  return 0.4
}
export const scratch: Synth = (ctx, d, t, x) => {
  noise(ctx, d, t, 0.12, 0.4 * G(x), {
    type: 'bandpass',
    f0: 3000 * P(x),
    f1: 500 * P(x),
    q: 4,
  })
  noise(ctx, d, t + 0.13, 0.1, 0.3 * G(x), {
    type: 'bandpass',
    f0: 600 * P(x),
    f1: 2500 * P(x),
    q: 4,
  })
  return 0.25
}
export const blip8bit: Synth = (ctx, d, t, x) => {
  const notes = [659, 988]
  notes.forEach((f, i) =>
    tone(ctx, d, t + i * 0.07, 'square', f * P(x), f * P(x), 0.08, 0.1 * G(x)),
  )
  return 0.2
}

/** Short 16-step loop per vibe (Highlight Reel background in phase 6). */
export function bgmLoop(scale: number[], tempo = 112): Synth {
  return (ctx, d, t, x) => {
    const step = 60 / tempo / 2
    for (let i = 0; i < 16; i++) {
      const f = scale[(i * 3 + (i >> 2)) % scale.length]!
      tone(
        ctx,
        d,
        t + i * step,
        'triangle',
        f * P(x),
        f * P(x),
        step * 0.9,
        0.06 * G(x),
      )
      if (i % 4 === 0)
        tone(ctx, d, t + i * step, 'sine', 110, 50, 0.15, 0.2 * G(x))
    }
    return step * 16
  }
}
