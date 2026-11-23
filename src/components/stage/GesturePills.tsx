import { useEffect, useRef, useState } from 'react'
import { useScene } from '@/store/scene'
import { useStage } from '@/store/stage'
import { gestureEmoji } from '@/i18n/gestures'
import { vi } from '@/i18n/vi'
import type { DerivedId, HandGestureId, InteractionMode } from '@/types'

type PillId = HandGestureId | DerivedId
interface Pill {
  id: PillId
  label: string
}

const pills: Record<InteractionMode, Pill[]> = {
  draw: [
    { id: 'POINT', label: vi.pills.draw },
    { id: 'TWO_FINGER', label: vi.pills.erase },
    { id: 'PINCH', label: vi.pills.grab },
    { id: 'OPEN_PALM', label: vi.pills.clear },
  ],
  meme: [
    { id: 'THUMB_UP', label: vi.pills.thumb },
    { id: 'VICTORY', label: vi.pills.victory },
    { id: 'MOUTH_OPEN', label: vi.pills.mouth },
    { id: 'HEART_TWO_HANDS', label: vi.pills.heart },
  ],
  challenge: [],
}

const KEY = 'memebooth.pillUses'
const SHRINK_AFTER = 3
function loadUses(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<
      string,
      number
    >
  } catch {
    return {}
  }
}

/**
 * Chips above the dock showing gestures usable in the current mode. A chip
 * lights up while its gesture is detected and shrinks to an icon after the
 * user has succeeded with it a few times.
 */
export function GesturePills() {
  const mode = useScene((s) => s.mode)
  const live = useStage((s) => s.live)
  const [uses, setUses] = useState(loadUses)
  const prev = useRef<Set<string>>(new Set())
  const active = new Set<string>()
  for (const g of live.gestures)
    for (const [id, v] of Object.entries(g)) if (v >= 0.6) active.add(id)
  for (const [id, v] of Object.entries(live.derived))
    if (v >= 0.6) active.add(id)
  const activeKey = [...active].sort().join(',')

  useEffect(() => {
    const now = new Set(activeKey ? activeKey.split(',') : [])
    const rising = [...now].filter((id) => !prev.current.has(id))
    prev.current = now
    if (!rising.length) return
    setUses((u) => {
      const next = { ...u }
      for (const id of rising) next[id] = (next[id] ?? 0) + 1
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* non-essential */
      }
      return next
    })
  }, [activeKey])

  const list = pills[mode]
  if (!list.length) return null
  return (
    <ul className="pills" aria-label={vi.pills.label}>
      {list.map((p) => {
        const small = (uses[p.id] ?? 0) >= SHRINK_AFTER
        return (
          <li
            key={p.id}
            className={
              'pill ' +
              (active.has(p.id) ? 'lit ' : '') +
              (small ? 'small' : '')
            }
            title={p.label}
          >
            <span aria-hidden>{gestureEmoji[p.id]}</span>
            <span className={small ? 'sr-only' : ''}>{p.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
