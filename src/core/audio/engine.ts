// Single AudioContext + master bus:
// voices -> masterGain -> limiter -> speakers
//                                 \-> MediaStreamDestination (recording)
export interface AudioBus {
  ctx: AudioContext
  master: GainNode
  limiter: DynamicsCompressorNode
  /** Feed for MediaRecorder (phase 5). Never routed back to speakers. */
  record: MediaStreamAudioDestinationNode | null
  /** Recording-only input (e.g. microphone when "record mic" is on). */
  recordOnly: GainNode
}

let bus: AudioBus | undefined
let muted = false

export function getBus(): AudioBus | undefined {
  return bus
}

function createBus(): AudioBus | undefined {
  const Ctor =
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return undefined
  const ctx = new Ctor()
  const master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.9
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.002
  limiter.release.value = 0.12
  master.connect(limiter)
  limiter.connect(ctx.destination)
  let record: MediaStreamAudioDestinationNode | null
  try {
    record = ctx.createMediaStreamDestination()
    limiter.connect(record)
  } catch {
    record = null
  }
  const recordOnly = ctx.createGain()
  if (record) recordOnly.connect(record)
  return { ctx, master, limiter, record, recordOnly }
}

/** Must be called from a user gesture (the Start button). */
export async function unlockAudio(): Promise<void> {
  bus ??= createBus()
  if (bus && bus.ctx.state === 'suspended') await bus.ctx.resume()
}

export function setMuted(value: boolean): void {
  muted = value
  if (bus)
    bus.master.gain.setTargetAtTime(value ? 0 : 0.9, bus.ctx.currentTime, 0.02)
}
export function isMuted(): boolean {
  return muted
}
