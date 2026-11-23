import { getBus } from './engine'

/**
 * Sound-reactive input: mic -> AnalyserNode (fft 1024) -> RMS -> EMA level.
 * The mic is NEVER connected to the speakers. It reaches the recording bus
 * only when `setRecordMic(true)`.
 */
export class MicAnalyser {
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private buf: Float32Array<ArrayBuffer> | null = null
  private recordGain: GainNode | null = null
  level = 0
  sensitivity = 1
  private lastPeak = 0

  get active(): boolean {
    return !!this.analyser
  }

  async start(): Promise<void> {
    const bus = getBus()
    if (!bus) throw new Error('audio-locked')
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    this.source = bus.ctx.createMediaStreamSource(this.stream)
    this.analyser = bus.ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.buf = new Float32Array(this.analyser.fftSize)
    this.source.connect(this.analyser)
    this.recordGain = bus.ctx.createGain()
    this.recordGain.gain.value = 0
    this.source.connect(this.recordGain)
    this.recordGain.connect(bus.recordOnly)
  }

  setRecordMic(on: boolean): void {
    if (this.recordGain) this.recordGain.gain.value = on ? 1 : 0
  }

  /** Call once per frame. Returns true on a loud peak (1 s cooldown). */
  update(now: number): boolean {
    if (!this.analyser || !this.buf) {
      this.level *= 0.9
      return false
    }
    this.analyser.getFloatTimeDomainData(this.buf)
    let sum = 0
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i]! * this.buf[i]!
    const rms = Math.sqrt(sum / this.buf.length)
    const target = Math.min(1, rms * 6 * this.sensitivity)
    this.level += (target - this.level) * 0.25
    if (target > 0.85 && now - this.lastPeak > 1000) {
      this.lastPeak = now
      return true
    }
    return false
  }

  stop(): void {
    this.source?.disconnect()
    this.recordGain?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.source = null
    this.analyser = null
    this.recordGain = null
    this.level = 0
  }
}
