export interface FrameStats {
  fps: number
  p95: number
  /** True when fps stayed below 50 for 2 s (adaptive quality signal). */
  degraded: boolean
}

export type FrameCallback = (now: number, dt: number) => void

/** rAF loop with FPS + p95 frame-time measurement. No allocation per frame. */
export class RenderLoop {
  private raf = 0
  private last = 0
  private readonly samples = new Float32Array(120)
  private readonly sorted = new Float32Array(120)
  private count = 0
  private head = 0
  private lowSince = -1
  stats: FrameStats = { fps: 0, p95: 0, degraded: false }

  constructor(private callback: FrameCallback) {}

  start(): void {
    if (this.raf) return
    this.last = performance.now()
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      const dt = Math.min(now - this.last, 250)
      this.last = now
      this.record(dt, now)
      this.callback(now, dt)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private record(dt: number, now: number): void {
    this.samples[this.head] = dt
    this.head = (this.head + 1) % this.samples.length
    this.count = Math.min(this.count + 1, this.samples.length)
    if (this.head % 15 !== 0) return
    let sum = 0
    for (let i = 0; i < this.count; i++) {
      sum += this.samples[i]!
      this.sorted[i] = this.samples[i]!
    }
    const view = this.sorted.subarray(0, this.count).sort()
    this.stats.fps = sum > 0 ? (1000 * this.count) / sum : 0
    this.stats.p95 = view[Math.floor(this.count * 0.95)] ?? 0
    if (this.stats.fps < 50) {
      if (this.lowSince < 0) this.lowSince = now
      this.stats.degraded = now - this.lowSince > 2000
    } else {
      this.lowSince = -1
      this.stats.degraded = false
    }
  }
}
