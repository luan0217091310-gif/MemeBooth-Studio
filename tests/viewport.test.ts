import { expect, it } from 'vitest'
import { createViewport, fromPixel, toPixel } from '@/core/canvas/viewport'

it('maps display space through a cover crop and back', () => {
  // 16:9 camera into a tall 9:16 stage: sides are cropped.
  const v = createViewport(450, 800, 1280, 720)
  const center = toPixel(v, { x: 0.5, y: 0.5 })
  expect(center.x).toBeCloseTo(225)
  expect(center.y).toBeCloseTo(400)
  const top = toPixel(v, { x: 0.5, y: 0 })
  expect(top.y).toBeCloseTo(0)
  const left = toPixel(v, { x: 0, y: 0.5 })
  expect(left.x).toBeLessThan(0)
  for (const p of [
    { x: 0.31, y: 0.77 },
    { x: 0.9, y: 0.1 },
  ]) {
    const px = toPixel(v, p)
    const back = fromPixel(v, px.x, px.y)
    expect(back.x).toBeCloseTo(p.x, 6)
    expect(back.y).toBeCloseTo(p.y, 6)
  }
})
