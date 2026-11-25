import { Shuffle, Sparkles, Sun } from 'lucide-react'
import { props } from '@/config/props'
import { vibes } from '@/config/vibes'
import { useCapture } from '@/store/capture'
import { useFx, type RingLightMode } from '@/store/fx'
import { useVibe } from '@/store/vibe'
import { vi } from '@/i18n/vi'

const RING_MODES: readonly RingLightMode[] = ['off', 'white', 'pink', 'warm']

/** Vibe Sync + Studio Beauty Glow + Ring Light + Frame Label picker. */
export function VibePicker() {
  const vibeId = useVibe((s) => s.vibeId)
  const setVibe = useVibe((s) => s.setVibe)
  const beauty = useFx((s) => s.beauty)
  const ringLight = useFx((s) => s.ringLight)
  const setFx = useFx((s) => s.set)
  const frameLabel = useCapture((s) => s.frameLabel)
  const setCapture = useCapture((s) => s.set)

  const surprise = () => {
    const otherVibes = vibes.filter((v) => v.id !== vibeId)
    const v = otherVibes[Math.floor(Math.random() * otherVibes.length)] ?? vibes[0]!
    setVibe(v.id)
    const p1 = props[Math.floor(Math.random() * props.length)]!
    setFx({ activeProps: [p1.id] })
  }

  return (
    <div className="panel-body">
      <div className="panel-actions">
        <button type="button" className="ghost small-btn" onClick={surprise}>
          <Shuffle size={15} />
          {vi.fx.surprise}
        </button>
      </div>
      <div className="studio-card">
        <label className="slider">
          <span className="slider-head">
            <Sparkles size={14} /> {vi.fx.beauty}
            <b>{Math.round(beauty * 100)}%</b>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={beauty}
            onChange={(e) => setFx({ beauty: Number(e.target.value) })}
          />
        </label>
        <div className="ring-row">
          <span className="slider-head">
            <Sun size={14} /> {vi.fx.ringLight}
          </span>
          <div className="ring-pills" role="radiogroup" aria-label={vi.fx.ringLight}>
            {RING_MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={ringLight === m}
                className={'ring-pill ' + (ringLight === m ? 'on' : '')}
                data-ring-swatch={m}
                onClick={() => setFx({ ringLight: m })}
              >
                {vi.fx.ringModes[m]}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          {vi.capture.frameLabel}
          <input
            type="text"
            maxLength={28}
            value={frameLabel}
            placeholder={vi.capture.frameLabelPh}
            onChange={(e) => setCapture({ frameLabel: e.target.value })}
          />
        </label>
      </div>
      <p className="panel-note">{vi.vibe.note}</p>
      <div className="vibe-grid" role="radiogroup" aria-label={vi.drawer.vibe}>
        {vibes.map((v) => (
          <button
            key={v.id}
            role="radio"
            aria-checked={vibeId === v.id}
            className={'vibe-tile ' + (vibeId === v.id ? 'on' : '')}
            data-dwell
            onClick={() => setVibe(v.id)}
            style={{
              background: v.ui['--mb-surface'],
              color: v.ui['--mb-text'],
              borderColor: v.ui['--mb-line'],
              borderRadius: v.ui['--mb-radius'],
            }}
          >
            <span className="vibe-swatches" aria-hidden>
              {v.brush.palette.slice(0, 4).map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
            <b>{v.name}</b>
            <small>{vi.vibe.desc[v.id] ?? ''}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Compact header chip that cycles vibes. */
export function VibeChip() {
  const { preset, vibeId, setVibe } = useVibe()
  const next = () => {
    const i = vibes.findIndex((v) => v.id === vibeId)
    setVibe(vibes[(i + 1) % vibes.length]!.id)
  }
  return (
    <button
      className="chip vibe-chip"
      onClick={next}
      data-dwell
      aria-label={vi.vibe.chip + ': ' + preset.name}
    >
      <span className="dot" aria-hidden />
      {preset.name}
    </button>
  )
}
