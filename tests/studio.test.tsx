import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App } from '@/app/App'
import { useSession } from '@/store/session'
import { vi } from '@/i18n/vi'

afterEach(() => {
  cleanup()
  useSession.setState(useSession.getInitialState())
})
it('opens and leaves the stage without requesting a camera', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: vi.start }))
  expect(screen.getByRole('heading', { name: vi.ready })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: vi.back }))
  expect(screen.getByRole('button', { name: vi.start })).toBeTruthy()
})
it('shows offline readiness only after the session receives it', () => {
  useSession.setState({ offline: 'unavailable' })
  render(<App />)
  expect(screen.getByRole('status').textContent).toBe(vi.offline.unavailable)
})
