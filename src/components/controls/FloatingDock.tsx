import { Camera, Trophy, Video } from 'lucide-react'
import { vi } from '@/i18n/vi'

/**
 * Smart Floating Dock: exactly three primary actions. Capture (phase 5) and
 * Challenge (phase 7) are not implemented yet, so the buttons are visibly
 * disabled with a "coming soon" label instead of pretending to work.
 */
export function FloatingDock() {
  const items = [
    {
      id: 'photo',
      label: vi.dock.photo,
      icon: <Camera size={26} />,
      key: 'Space',
    },
    { id: 'video', label: vi.dock.video, icon: <Video size={26} />, key: 'R' },
    {
      id: 'challenge',
      label: vi.dock.challenge,
      icon: <Trophy size={26} />,
      key: '',
    },
  ]
  return (
    <div className="dock" role="toolbar" aria-label={vi.dock.label}>
      {items.map((it) => (
        <button
          key={it.id}
          className="dock-btn"
          aria-disabled
          data-dock={it.id}
          title={it.label + ' · ' + vi.soon}
          onClick={(e) => e.preventDefault()}
        >
          {it.icon}
          <span>{it.label}</span>
          <small>{vi.soon}</small>
        </button>
      ))}
    </div>
  )
}
