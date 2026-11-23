import { useEffect, useRef, type ReactNode } from 'react'
import {
  BookHeart,
  Brush,
  Glasses,
  Laugh,
  Palette,
  Settings,
  Smile,
  WandSparkles,
  X,
} from 'lucide-react'
import { BrushPanel, StickerPanel } from './CreativeToolbar'
import { MemePanel } from './MemePanel'
import { PropsPanel, SettingsPanel } from './EffectsPanel'
import { VibePicker } from './VibePicker'
import { useUi, type DrawerPanel } from '@/store/ui'
import { vi } from '@/i18n/vi'

interface Entry {
  id: DrawerPanel
  label: string
  icon: ReactNode
  /** Phase in which the panel ships; earlier it shows as disabled. */
  soon?: boolean
}

const entries: Entry[] = [
  { id: 'brush', label: vi.drawer.brush, icon: <Brush size={20} /> },
  { id: 'sticker', label: vi.drawer.sticker, icon: <Smile size={20} /> },
  { id: 'memes', label: vi.drawer.memes, icon: <Laugh size={20} /> },
  {
    id: 'creator',
    label: vi.drawer.creator,
    icon: <WandSparkles size={20} />,
    soon: true,
  },
  { id: 'props', label: vi.drawer.props, icon: <Glasses size={20} /> },
  { id: 'vibe', label: vi.drawer.vibe, icon: <Palette size={20} /> },
  {
    id: 'book',
    label: vi.drawer.book,
    icon: <BookHeart size={20} />,
    soon: true,
  },
  { id: 'settings', label: vi.drawer.settings, icon: <Settings size={20} /> },
]

function panelFor(id: DrawerPanel) {
  switch (id) {
    case 'brush':
      return <BrushPanel />
    case 'sticker':
      return <StickerPanel />
    case 'memes':
      return <MemePanel />
    case 'props':
      return <PropsPanel />
    case 'vibe':
      return <VibePicker />
    case 'settings':
      return <SettingsPanel />
    default:
      return null
  }
}

/** Right drawer: icon rail, one panel open at a time (bottom sheet on mobile). */
export function SideDrawer() {
  const open = useUi((s) => s.drawer)
  const setDrawer = useUi((s) => s.setDrawer)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])
  const current = entries.find((e) => e.id === open)
  return (
    <>
      <nav className="drawer-rail" aria-label={vi.drawer.label}>
        {entries.map((e) => (
          <button
            key={e.id}
            className={'rail-btn ' + (open === e.id ? 'on' : '')}
            aria-label={e.soon ? e.label + ' (' + vi.soon + ')' : e.label}
            aria-expanded={open === e.id}
            aria-controls="drawer-panel"
            title={e.soon ? e.label + ' · ' + vi.soon : e.label}
            disabled={e.soon}
            data-dwell
            onClick={() => setDrawer(open === e.id ? null : e.id)}
          >
            {e.icon}
          </button>
        ))}
      </nav>
      {current && (
        <section
          id="drawer-panel"
          ref={panelRef}
          tabIndex={-1}
          className="drawer-panel"
          aria-label={current.label}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setDrawer(null)
            }
          }}
        >
          <header>
            <h2>{current.label}</h2>
            <button
              className="round"
              aria-label={vi.close}
              onClick={() => setDrawer(null)}
            >
              <X size={18} />
            </button>
          </header>
          {panelFor(current.id)}
        </section>
      )}
    </>
  )
}
