import type { Vec2 } from '@/types'
import { spriteIndex, type SpriteName } from './atlas'
import type { ParticlePool } from './pool'

export interface EmitterPreset {
  sprites: SpriteName[]
  count: number
  /** 'burst' explodes from a point, 'rain' falls from the top, 'fountain' sprays upward. */
  mode: 'burst' | 'rain' | 'fountain' | 'spray'
  speed: [number, number]
  life: [number, number]
  /** Size as fraction of stage width. */
  size: [number, number]
  gravity: number
  spin?: number
  /** Rain only: how long spawning continues (s). */
  duration?: number
}

export const emitterPresets: Record<string, EmitterPreset> = {
  confetti: {
    sprites: ['confetti'],
    count: 90,
    mode: 'burst',
    speed: [0.35, 0.9],
    life: [1.2, 2.2],
    size: [0.012, 0.02],
    gravity: 0.9,
    spin: 8,
  },
  hearts: {
    sprites: ['heart', 'heartPastel'],
    count: 40,
    mode: 'burst',
    speed: [0.2, 0.5],
    life: [1.2, 2],
    size: [0.025, 0.045],
    gravity: -0.25,
    spin: 1,
  },
  heartRain: {
    sprites: ['heartPastel', 'heart'],
    count: 120,
    mode: 'rain',
    speed: [0.15, 0.3],
    life: [2.5, 3.5],
    size: [0.025, 0.045],
    gravity: 0.05,
    spin: 1,
    duration: 2,
  },
  stars: {
    sprites: ['star', 'sparkle'],
    count: 60,
    mode: 'burst',
    speed: [0.4, 1],
    life: [0.8, 1.5],
    size: [0.02, 0.04],
    gravity: 0.3,
    spin: 5,
  },
  sparkles: {
    sprites: ['sparkle'],
    count: 35,
    mode: 'burst',
    speed: [0.1, 0.35],
    life: [0.6, 1.2],
    size: [0.015, 0.035],
    gravity: -0.1,
    spin: 2,
  },
  sweat: {
    sprites: ['drop'],
    count: 70,
    mode: 'rain',
    speed: [0.4, 0.7],
    life: [1.5, 2.2],
    size: [0.018, 0.03],
    gravity: 0.6,
    duration: 1.4,
  },
  fire: {
    sprites: ['flame'],
    count: 50,
    mode: 'fountain',
    speed: [0.3, 0.6],
    life: [0.6, 1.1],
    size: [0.03, 0.05],
    gravity: -0.4,
    spin: 0.5,
  },
  bubbles: {
    sprites: ['bubble'],
    count: 30,
    mode: 'fountain',
    speed: [0.15, 0.35],
    life: [1.5, 2.5],
    size: [0.03, 0.06],
    gravity: -0.15,
  },
  balloons: {
    sprites: ['balloon'],
    count: 14,
    mode: 'fountain',
    speed: [0.2, 0.35],
    life: [2.5, 3.5],
    size: [0.05, 0.08],
    gravity: -0.12,
    spin: 0.3,
  },
  kisses: {
    sprites: ['kiss', 'heart'],
    count: 18,
    mode: 'spray',
    speed: [0.25, 0.45],
    life: [1.2, 1.8],
    size: [0.025, 0.04],
    gravity: -0.15,
    spin: 1,
  },
  questions: {
    sprites: ['question'],
    count: 10,
    mode: 'burst',
    speed: [0.2, 0.4],
    life: [1.4, 2],
    size: [0.04, 0.07],
    gravity: 0.5,
    spin: 3,
  },
  rainbow: {
    sprites: ['confetti'],
    count: 160,
    mode: 'spray',
    speed: [0.6, 1.1],
    life: [0.7, 1.2],
    size: [0.012, 0.022],
    gravity: 0.7,
    spin: 4,
  },
  bolts: {
    sprites: ['bolt'],
    count: 24,
    mode: 'burst',
    speed: [0.4, 0.9],
    life: [0.5, 0.9],
    size: [0.03, 0.05],
    gravity: 0,
    spin: 6,
  },
  butterflies: {
    sprites: ['butterfly'],
    count: 16,
    mode: 'fountain',
    speed: [0.15, 0.3],
    life: [2, 3],
    size: [0.035, 0.05],
    gravity: -0.08,
    spin: 0.6,
  },
  pixels: {
    sprites: ['pixel', 'pixelPurple'],
    count: 60,
    mode: 'burst',
    speed: [0.3, 0.8],
    life: [0.6, 1.2],
    size: [0.01, 0.018],
    gravity: 0.4,
  },
  notes: {
    sprites: ['note'],
    count: 14,
    mode: 'fountain',
    speed: [0.15, 0.3],
    life: [1.4, 2],
    size: [0.03, 0.045],
    gravity: -0.1,
    spin: 1,
  },
  /** Small burst for sound-reactive peaks. */
  peak: {
    sprites: ['sparkle', 'star'],
    count: 18,
    mode: 'burst',
    speed: [0.2, 0.5],
    life: [0.5, 0.9],
    size: [0.012, 0.024],
    gravity: 0.2,
    spin: 3,
  },
}

const rand = (r: [number, number]) => r[0] + Math.random() * (r[1] - r[0])

interface RainJob {
  preset: EmitterPreset
  remaining: number
  rate: number
  acc: number
}

/** Spawns preset particles into the pool; supports timed "rain" jobs. */
export class Emitters {
  private jobs: RainJob[] = []
  /** Scales particle counts (adaptive quality / reduced motion). */
  density = 1

  constructor(private pool: ParticlePool) {}

  /**
   * @param at display-space origin
   * @param aspect srcH/srcW, so velocities look isotropic on screen
   * @param dir spray direction in radians (spray mode)
   */
  emit(name: string, at: Vec2, aspect: number, dir = -Math.PI / 2): void {
    const preset = emitterPresets[name]
    if (!preset) return
    const n = Math.max(1, Math.round(preset.count * this.density))
    if (preset.mode === 'rain') {
      this.jobs.push({
        preset,
        remaining: n,
        rate: n / (preset.duration ?? 1.5),
        acc: 0,
      })
      return
    }
    for (let i = 0; i < n; i++) this.one(preset, at, aspect, dir)
  }

  private one(
    p: EmitterPreset,
    at: Vec2,
    aspect: number,
    dir: number,
    forceSpray = false,
  ): void {
    const speed = rand(p.speed)
    let angle: number
    switch (forceSpray ? 'spray' : p.mode) {
      case 'fountain':
        angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2
        break
      case 'spray':
        angle = dir + (Math.random() - 0.5) * 0.7
        break
      default:
        angle = Math.random() * Math.PI * 2
    }
    const sprite = p.sprites[Math.floor(Math.random() * p.sprites.length)]!
    this.pool.spawn(
      at.x,
      at.y,
      Math.cos(angle) * speed,
      (Math.sin(angle) * speed) / aspect,
      rand(p.life),
      rand(p.size),
      spriteIndex(sprite),
      Math.random() * 12,
      p.gravity / aspect,
      (Math.random() - 0.5) * 2 * (p.spin ?? 0),
    )
  }

  /** Advances rain jobs (spawn from random x along the top). */
  update(dt: number, aspect: number): void {
    for (let j = this.jobs.length - 1; j >= 0; j--) {
      const job = this.jobs[j]!
      job.acc += job.rate * dt
      while (job.acc >= 1 && job.remaining > 0) {
        job.acc -= 1
        job.remaining--
        this.one(
          job.preset,
          { x: Math.random(), y: -0.05 },
          aspect,
          Math.PI / 2,
          true,
        )
      }
      if (job.remaining <= 0) this.jobs.splice(j, 1)
    }
  }

  clear(): void {
    this.jobs.length = 0
  }
}
