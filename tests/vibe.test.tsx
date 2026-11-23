import { afterEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App } from '@/app/App'
import { vibes } from '@/config/vibes'
import { useScene } from '@/store/scene'
import { useSession } from '@/store/session'
import { useVibe } from '@/store/vibe'
import { vi } from '@/i18n/vi'

afterEach(() => {
  cleanup()
  useSession.setState(useSession.getInitialState())
  useScene.setState(useScene.getInitialState())
})

it('ships four vibes, each with tokens, filter, brush, particles and sounds', () => {
  expect(vibes.map((v) => v.id)).toEqual(['kawaii', 'y2k', 'chaotic', 'neon'])
  for (const v of vibes) {
    expect(v.ui['--mb-accent']).toBeTruthy()
    expect(v.brush.palette.length).toBeGreaterThan(3)
    expect(v.particles.length).toBeGreaterThan(0)
    expect(v.sounds.bgm).toMatch(/^bgm-/)
  }
})

it('switching vibe re-themes instantly and keeps drawings', () => {
  useScene.getState().commit({
    strokes: [
      {
        id: 's',
        brushId: 'pastel',
        color: '#000',
        width: 0.01,
        points: [[0.1, 0.1, 0]],
      },
    ],
  })
  const { container } = render(<App />)
  const root = container.querySelector('main')!
  const t0 = performance.now()
  act(() => useVibe.getState().setVibe('neon'))
  expect(performance.now() - t0).toBeLessThan(300)
  expect(root.dataset.vibe).toBe('neon')
  expect(root.style.getPropertyValue('--mb-bg')).toBe('#0b0b1a')
  expect(useScene.getState().strokes).toHaveLength(1)
  expect(useScene.getState().brushId).toBe('neon')
  act(() => useVibe.getState().setVibe('kawaii'))
})

it('live stage shows the dock, drawer rail and quick bar', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: vi.start }))
  expect(
    await screen.findByRole(
      'toolbar',
      { name: vi.dock.label },
      { timeout: 15_000 },
    ),
  ).toBeTruthy()
  expect(screen.getByRole('navigation', { name: vi.drawer.label })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: vi.drawer.memes }))
  expect(screen.getByRole('region', { name: vi.drawer.memes })).toBeTruthy()
  expect(screen.getAllByText('Đỉnh nóc kịch trần').length).toBeGreaterThan(0)
}, 30_000)
