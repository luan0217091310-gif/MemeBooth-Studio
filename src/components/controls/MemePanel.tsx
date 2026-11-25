import { useState } from 'react'
import { getStageEngine } from '@/components/stage/CameraStage'
import { useMemes } from '@/store/memes'
import { triggerEmoji, triggerLabel } from '@/i18n/gestures'
import { vi } from '@/i18n/vi'

type Tab = 'all' | 'ultra' | 'hand' | 'face'

const svgUrl = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

/** Meme library with category tabs: shows each trigger and fires on click. */
export function MemePanel() {
  const memes = useMemes((s) => s.memes)
  const [tab, setTab] = useState<Tab>('all')

  const isUltra = (m: (typeof memes)[number]) =>
    m.trigger.priority >= 100 || m.id.startsWith('ultra-')
  const isHand = (m: (typeof memes)[number]) =>
    m.trigger.all.some(
      (c) =>
        c.kind === 'hand' ||
        (c.kind === 'derived' && c.id === 'HEART_TWO_HANDS'),
    )
  const isFace = (m: (typeof memes)[number]) =>
    m.trigger.all.some(
      (c) =>
        c.kind === 'face' ||
        (c.kind === 'derived' && c.id !== 'HEART_TWO_HANDS'),
    )

  const filtered = memes.filter((m) => {
    if (tab === 'ultra') return isUltra(m)
    if (tab === 'hand') return isHand(m)
    if (tab === 'face') return isFace(m)
    return true
  })

  const ultra = filtered.filter(isUltra)
  const regular = filtered.filter((m) => !isUltra(m))

  const tile = (m: (typeof memes)[number]) => (
    <button
      key={m.id}
      className="meme-tile"
      onClick={() => getStageEngine()?.triggerMeme(m.id)}
      title={vi.fx.fire + ': ' + m.name}
    >
      {m.visual.kind === 'svg' && <img src={svgUrl(m.visual.svg)} alt="" />}
      <span className="meme-name">{m.name}</span>
      <span className="meme-trigger">
        <span aria-hidden>{triggerEmoji(m.trigger)}</span>{' '}
        {triggerLabel(m.trigger)}
      </span>
    </button>
  )

  return (
    <div className="panel-body">
      <p className="panel-note">{vi.fx.memeNote}</p>
      <div className="meme-tabs" role="tablist">
        {(['all', 'ultra', 'hand', 'face'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'on' : ''}
            onClick={() => setTab(t)}
          >
            {vi.fx.memeTabs[t]}
          </button>
        ))}
      </div>
      {ultra.length > 0 && (
        <>
          <h3 className="panel-sub">{vi.fx.ultra}</h3>
          <div className="meme-grid">{ultra.map(tile)}</div>
        </>
      )}
      {regular.length > 0 && (
        <>
          <h3 className="panel-sub">{vi.fx.regular}</h3>
          <div className="meme-grid">{regular.map(tile)}</div>
        </>
      )}
    </div>
  )
}
