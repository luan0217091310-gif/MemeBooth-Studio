import { getStageEngine } from '@/core/engineRef'
import { useScene } from '@/store/scene'
import { useStage } from '@/store/stage'
import { useUi } from '@/store/ui'
import {
  derivedName,
  gestureEmoji,
  handGestureName,
} from '@/i18n/gestures'
import { vi } from '@/i18n/vi'
import type { DerivedId, HandGestureId } from '@/types'

type PillId = HandGestureId | DerivedId

interface MemePill {
  id: PillId
  memeId: string
  label: string
}

const memePills: MemePill[] = [
  { id: 'THUMB_UP', memeId: 'top-roof', label: vi.pills.thumb },
  { id: 'VICTORY', memeId: 'say-cheese', label: vi.pills.victory },
  { id: 'I_LOVE_YOU', memeId: 'love-all', label: vi.pills.love },
  { id: 'FIST', memeId: 'determined', label: vi.pills.fist },
  { id: 'MOUTH_OPEN', memeId: 'ultra-shock', label: vi.pills.mouth },
  { id: 'SMILE', memeId: 'halo', label: vi.pills.smile },
  { id: 'HEART_TWO_HANDS', memeId: 'ultra-romance', label: vi.pills.heart },
]

const drawTips: { emoji: string; label: string }[] = [
  { emoji: '✏️', label: vi.pills.draw },
  { emoji: '🤏', label: vi.pills.grab },
  { emoji: '😄', label: vi.pills.clear },
]

function labelOf(id: string): string {
  return (
    handGestureName[id as HandGestureId] ??
    derivedName[id as DerivedId] ??
    id
  )
}

/**
 * Top live AI gesture radar pill: shows instant visual feedback when the camera
 * sees your hand/face or locks onto a gesture so recognition feels crystal clear.
 */
export function GestureRadarBadge() {
  const camera = useStage((s) => s.camera)
  const vision = useStage((s) => s.vision)
  const radar = useStage((s) => s.radar)
  const hint = useUi((s) => s.hint)
  const mode = useScene((s) => s.mode)

  if (hint || mode === 'challenge') return null
  if (camera === 'requesting' || camera === 'error' || camera === 'ended')
    return null
  if (vision === 'loading') return null

  if (camera === 'off') {
    return (
      <div className="gesture-radar is-idle" role="status">
        <span>✨ {vi.radar.noCamera}</span>
      </div>
    )
  }
  if (vision !== 'ready') return null

  const { topId, pending, hands, faces } = radar
  const emoji = topId ? (gestureEmoji[topId as PillId] ?? '✨') : ''
  const detectedName = topId ? labelOf(topId) : ''

  return (
    <div
      className={
        'gesture-radar ' +
        (pending
          ? 'is-charging'
          : topId
            ? 'is-active'
            : hands > 0 || faces > 0
              ? 'is-tracking'
              : 'is-idle')
      }
      role="status"
      aria-live="polite"
    >
      <span className="radar-dot" aria-hidden />
      {pending ? (
        <>
          <span className="radar-text">
            {emoji ? emoji + ' ' : ''}
            <b>{pending.name}</b>
          </span>
          <span className="radar-bar" aria-hidden>
            <i style={{ width: Math.round(pending.progress * 100) + '%' }} />
          </span>
        </>
      ) : topId ? (
        <span className="radar-text">
          {emoji} <b>{detectedName}</b>
        </span>
      ) : hands > 0 ? (
        <span className="radar-text">{vi.radar.seeingHand}</span>
      ) : faces > 0 ? (
        <span className="radar-text">{vi.radar.seeingFace}</span>
      ) : (
        <span className="radar-text">{vi.radar.ready}</span>
      )}
    </div>
  )
}

/**
 * Interactive gesture bar above the dock. Lights up in real time when AI sees
 * the gesture, and lets you click any pill to fire the meme immediately.
 */
export function GesturePills() {
  const mode = useScene((s) => s.mode)
  const activeKey = useStage((s) => s.radar.activeKey)

  if (mode === 'challenge') return null

  if (mode === 'draw') {
    return (
      <ul className="pills" aria-label={vi.pills.label}>
        {drawTips.map((t) => (
          <li key={t.label} className="pill">
            <span aria-hidden>{t.emoji}</span>
            <span>{t.label}</span>
          </li>
        ))}
      </ul>
    )
  }

  const active = new Set(activeKey ? activeKey.split(',') : [])

  return (
    <div className="pills" role="group" aria-label={vi.pills.label}>
      {memePills.map((p) => {
        const isLit = active.has(p.id)
        return (
          <button
            key={p.id}
            type="button"
            className={'pill pill-btn ' + (isLit ? 'lit' : '')}
            title={vi.fx.fire + ': ' + p.label}
            onClick={() => getStageEngine()?.triggerMeme(p.memeId)}
          >
            <span aria-hidden>{gestureEmoji[p.id]}</span>
            <span>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}
