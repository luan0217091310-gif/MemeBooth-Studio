import { getStageEngine } from '@/components/stage/CameraStage'
import { useMemes } from '@/store/memes'
import { triggerEmoji, triggerLabel } from '@/i18n/gestures'
import { vi } from '@/i18n/vi'

const svgUrl = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

/** Meme library: shows each trigger and fires it on click (works without a camera). */
export function MemePanel() {
  const memes = useMemes((s) => s.memes)
  const ultra = memes.filter(
    (m) => m.trigger.priority >= 100 || m.id.startsWith('ultra-'),
  )
  const regular = memes.filter((m) => !ultra.includes(m))
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
      <h3 className="panel-sub">{vi.fx.ultra}</h3>
      <div className="meme-grid">{ultra.map(tile)}</div>
      <h3 className="panel-sub">{vi.fx.regular}</h3>
      <div className="meme-grid">{regular.map(tile)}</div>
    </div>
  )
}
