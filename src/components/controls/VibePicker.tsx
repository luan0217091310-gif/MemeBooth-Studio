import { vibes } from '@/config/vibes'
import { useVibe } from '@/store/vibe'
import { vi } from '@/i18n/vi'

/** Vibe Sync picker: one click re-themes UI, filter, brush, particles, sounds. */
export function VibePicker() {
  const vibeId = useVibe((s) => s.vibeId)
  const setVibe = useVibe((s) => s.setVibe)
  return (
    <div className="panel-body">
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
