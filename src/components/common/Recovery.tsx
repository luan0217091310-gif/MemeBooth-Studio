import { Component, type ReactNode } from 'react'
import { vi } from '@/i18n/vi'
export class Recovery extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="recovery">
        <h1>{vi.crash}</h1>
        <button onClick={() => location.reload()}>{vi.retry}</button>
      </main>
    ) : (
      this.props.children
    )
  }
}
