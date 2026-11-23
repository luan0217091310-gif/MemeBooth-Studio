/**
 * Fixed-size particle pool in Structure-of-Arrays form. No allocation after
 * construction; when full, the oldest particle (ring order) is recycled.
 * Positions are display space (x in width units 0..1, y in height units 0..1).
 */
export class ParticlePool {
  readonly capacity: number
  readonly x: Float32Array
  readonly y: Float32Array
  readonly vx: Float32Array
  readonly vy: Float32Array
  readonly life: Float32Array
  readonly maxLife: Float32Array
  readonly size: Float32Array
  readonly rotation: Float32Array
  readonly spin: Float32Array
  readonly hue: Float32Array
  readonly gravity: Float32Array
  readonly sprite: Uint8Array
  private next = 0
  alive = 0

  constructor(capacity = 2000) {
    this.capacity = capacity
    const f = () => new Float32Array(capacity)
    this.x = f()
    this.y = f()
    this.vx = f()
    this.vy = f()
    this.life = f()
    this.maxLife = f()
    this.size = f()
    this.rotation = f()
    this.spin = f()
    this.hue = f()
    this.gravity = f()
    this.sprite = new Uint8Array(capacity)
  }

  /** Writes one particle into the next slot (recycling the oldest when full). */
  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    sprite: number,
    hue = 0,
    gravity = 0,
    spin = 0,
  ): number {
    const i = this.next
    this.next = (this.next + 1) % this.capacity
    if (this.life[i]! <= 0) this.alive++
    this.x[i] = x
    this.y[i] = y
    this.vx[i] = vx
    this.vy[i] = vy
    this.life[i] = life
    this.maxLife[i] = life
    this.size[i] = size
    this.sprite[i] = sprite
    this.hue[i] = hue
    this.gravity[i] = gravity
    this.rotation[i] = 0
    this.spin[i] = spin
    return i
  }

  /** Advances all particles by dt seconds. */
  update(dt: number): void {
    let alive = 0
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i]! <= 0) continue
      const l = this.life[i]! - dt
      this.life[i] = l
      if (l <= 0) continue
      alive++
      this.vy[i] = this.vy[i]! + this.gravity[i]! * dt
      this.x[i] = this.x[i]! + this.vx[i]! * dt
      this.y[i] = this.y[i]! + this.vy[i]! * dt
      this.rotation[i] = this.rotation[i]! + this.spin[i]! * dt
    }
    this.alive = alive
  }

  clear(): void {
    this.life.fill(0)
    this.alive = 0
  }
}
