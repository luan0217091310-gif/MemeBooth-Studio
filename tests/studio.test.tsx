import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App } from '@/app/App'
import { useSession } from '@/store/session'
import { useStage } from '@/store/stage'
import { vi } from '@/i18n/vi'

afterEach(() => {
  cleanup()
  useSession.setState(useSession.getInitialState())
})
it('falls back to a mouse-only stage when the camera is unavailable', async () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: vi.start }))
  // jsdom has no getUserMedia: the permission card must offer a no-camera path.
  const skip = await screen.findByRole('button', { name: vi.camera.noCamera })
  fireEvent.click(skip)
  expect(useStage.getState().camera).toBe('off')
  fireEvent.click(screen.getByRole('button', { name: vi.back }))
  expect(screen.getByRole('button', { name: vi.start })).toBeTruthy()
})
it('shows offline readiness only after the session receives it', () => {
  useSession.setState({ offline: 'unavailable' })
  render(<App />)
  expect(screen.getByRole('status').textContent).toBe(vi.offline.unavailable)
})
