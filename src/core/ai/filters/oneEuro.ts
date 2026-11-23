// One Euro filter (Casiez et al. 2012): adaptive low-pass, low jitter at rest, low lag when fast.
export interface OneEuroParams {
  minCutoff: number
  beta: number
  dCutoff: number
}

export const defaultOneEuro: OneEuroParams = {
  minCutoff: 1.0,
  beta: 0.007,
  dCutoff: 1.0,
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

export class OneEuroFilter {
  private x = 0
  private dx = 0
  private lastT = -1
  constructor(public params: OneEuroParams = defaultOneEuro) {}

  reset(): void {
    this.lastT = -1
  }

  /** @param t time in milliseconds */
  filter(value: number, t: number): number {
    if (this.lastT < 0) {
      this.x = value
      this.dx = 0
      this.lastT = t
      return value
    }
    const dt = Math.max((t - this.lastT) / 1000, 1e-4)
    this.lastT = t
    const rawDx = (value - this.x) / dt
    this.dx += alpha(this.params.dCutoff, dt) * (rawDx - this.dx)
    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.dx)
    this.x += alpha(cutoff, dt) * (value - this.x)
    return this.x
  }
}

/** Filters a fixed-length array of 2D points in place-friendly fashion. */
export class PointSetFilter {
  private fx: OneEuroFilter[] = []
  private fy: OneEuroFilter[] = []
  constructor(public params: OneEuroParams = defaultOneEuro) {}

  reset(): void {
    this.fx.forEach((f) => f.reset())
    this.fy.forEach((f) => f.reset())
  }

  apply(
    points: readonly { x: number; y: number }[],
    t: number,
    out: { x: number; y: number }[],
  ): void {
    while (this.fx.length < points.length) {
      this.fx.push(new OneEuroFilter(this.params))
      this.fy.push(new OneEuroFilter(this.params))
    }
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!
      const target = out[i] ?? (out[i] = { x: 0, y: 0 })
      target.x = this.fx[i]!.filter(p.x, t)
      target.y = this.fy[i]!.filter(p.y, t)
    }
    out.length = points.length
  }
}
