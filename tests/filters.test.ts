import { describe, expect, it } from 'vitest'
import { OneEuroFilter } from '@/core/ai/filters/oneEuro'
import { Ema } from '@/core/ai/filters/ema'
import { Hysteresis } from '@/core/ai/filters/hysteresis'

describe('OneEuroFilter', () => {
  it('suppresses jitter on a still point', () => {
    const f = new OneEuroFilter()
    let maxDev = 0
    for (let i = 0; i < 120; i++) {
      const noisy = 0.5 + (i % 2 ? 0.004 : -0.004)
      const out = f.filter(noisy, i * 16.7)
      if (i > 10) maxDev = Math.max(maxDev, Math.abs(out - 0.5))
    }
    expect(maxDev).toBeLessThan(0.002)
  })
  it('follows fast motion with limited lag', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0.5, dCutoff: 1 })
    let out = 0
    for (let i = 0; i <= 30; i++) out = f.filter(i / 30, i * 16.7)
    expect(out).toBeGreaterThan(0.9)
  })
  it('restarts from the next sample after reset', () => {
    const f = new OneEuroFilter()
    f.filter(0, 0)
    f.reset()
    expect(f.filter(1, 100)).toBe(1)
  })
})

describe('Ema and Hysteresis', () => {
  it('ema converges', () => {
    const e = new Ema(0.3)
    let v = 0
    for (let i = 0; i < 30; i++) v = e.next(1)
    expect(v).toBeGreaterThan(0.99)
  })
  it('uses separate enter and exit thresholds', () => {
    const h = new Hysteresis(0.65, 0.5)
    expect(h.update(0.6)).toBe(false)
    expect(h.update(0.7)).toBe(true)
    expect(h.update(0.55)).toBe(true)
    expect(h.update(0.45)).toBe(false)
    const pinch = new Hysteresis(0.25, 0.35)
    expect(pinch.updateBelow(0.3)).toBe(false)
    expect(pinch.updateBelow(0.2)).toBe(true)
    expect(pinch.updateBelow(0.3)).toBe(true)
    expect(pinch.updateBelow(0.4)).toBe(false)
  })
})
