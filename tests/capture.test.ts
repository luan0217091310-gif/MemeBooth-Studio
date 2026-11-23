import { describe, expect, it } from 'vitest'
import { pickMime, VIDEO_MIME_PREFERENCE } from '@/core/audio/recorder'
import { captureFilename } from '@/core/capture/filename'
import { layouts } from '@/core/capture/layouts'
import { Compositor } from '@/core/canvas/compositor'
import { createViewport } from '@/core/canvas/viewport'

describe('recorder mime selection', () => {
  it('prefers VP9 webm on Chrome-like browsers', () => {
    expect(pickMime(() => true)).toEqual({
      mime: VIDEO_MIME_PREFERENCE[0],
      ext: 'webm',
    })
  })
  it('falls back to mp4 on Safari-like browsers and names the file .mp4', () => {
    expect(pickMime((m) => m.startsWith('video/mp4'))?.ext).toBe('mp4')
  })
  it('survives isTypeSupported throwing and returns null when nothing works', () => {
    expect(
      pickMime(() => {
        throw new Error('nope')
      }),
    ).toBeNull()
    expect(pickMime(() => false)).toBeNull()
  })
})

it('builds memebooth_YYYYMMDD_HHmmss filenames', () => {
  const d = new Date(2026, 10, 24, 9, 5, 7)
  expect(captureFilename('png', d)).toBe('memebooth_20261124_090507.png')
  expect(captureFilename('.webm', d)).toBe('memebooth_20261124_090507.webm')
})

describe('layouts', () => {
  it('has the four required layouts with the right shot counts', () => {
    expect(layouts.polaroid.shots).toBe(1)
    expect(layouts.strip.shots).toBe(4)
    expect(layouts.grid.shots).toBe(4)
    expect(layouts.single.shots).toBe(1)
    expect([layouts.strip.width, layouts.strip.height]).toEqual([1200, 3600])
  })
  it('keeps every cell and label inside the canvas', () => {
    for (const l of Object.values(layouts)) {
      expect(l.cells).toHaveLength(l.shots)
      for (const r of [...l.cells, l.label]) {
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.y).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w).toBeLessThanOrEqual(l.width)
        expect(r.y + r.h).toBeLessThanOrEqual(l.height)
      }
    }
  })
})

it('compositor output keeps the preview crop and never exceeds source pixels', () => {
  // Wide stage over a 16:9 camera: top/bottom are cropped in the preview.
  const view = createViewport(1600, 600, 1280, 720)
  const { w, h } = Compositor.sizeFor(view, 1280)
  expect(w / h).toBeCloseTo(1600 / 600, 2)
  expect(w).toBe(1280)
  // Live-clip size: long edge 640.
  expect(Compositor.sizeFor(view, 640).w).toBe(640)
})
