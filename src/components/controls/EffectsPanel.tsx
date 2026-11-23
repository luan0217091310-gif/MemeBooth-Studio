import { props } from '@/config/props'
import { getStageEngine } from '@/components/stage/CameraStage'
import { useFx } from '@/store/fx'
import { useAlbum } from '@/store/album'
import { useEffect } from 'react'
import { vi } from '@/i18n/vi'

const propUrl = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

/** AR props picker. */
export function PropsPanel() {
  const active = useFx((s) => s.activeProps)
  const toggle = useFx((s) => s.toggleProp)
  return (
    <div className="panel-body">
      <p className="panel-note">{vi.fx.propsNote}</p>
      <div className="prop-grid">
        {props.map((p) => (
          <button
            key={p.id}
            className={'prop-tile ' + (active.includes(p.id) ? 'on' : '')}
            aria-pressed={active.includes(p.id)}
            onClick={() => toggle(p.id)}
          >
            <img src={propUrl(p.svg)} alt="" />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Sound, microphone and accessibility settings. */
export function SettingsPanel() {
  const fx = useFx()
  const engine = () => getStageEngine()
  const usage = useAlbum((s) => s.usage)
  useEffect(() => {
    void useAlbum
      .getState()
      .refresh()
      .catch(() => undefined)
  }, [])
  return (
    <div className="panel-body settings">
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.muted}
          onChange={(e) => engine()?.setMuted(e.target.checked)}
        />
        {vi.fx.mute}
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.soundReactive}
          disabled={fx.micStatus === 'starting'}
          onChange={(e) => void engine()?.setSoundReactive(e.target.checked)}
        />
        {vi.fx.soundReactive}
      </label>
      {fx.micStatus === 'denied' && (
        <p className="panel-note warn">{vi.fx.micDenied}</p>
      )}
      <label className="slider">
        {vi.fx.sensitivity} {fx.micSensitivity.toFixed(1)}
        <input
          type="range"
          min={0.3}
          max={3}
          step={0.1}
          value={fx.micSensitivity}
          onChange={(e) => fx.set({ micSensitivity: Number(e.target.value) })}
        />
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.recordMic}
          onChange={(e) => {
            fx.set({ recordMic: e.target.checked })
            engine()?.mic.setRecordMic(e.target.checked)
          }}
        />
        {vi.fx.recordMic}
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.reduceFlash}
          onChange={(e) => fx.set({ reduceFlash: e.target.checked })}
        />
        {vi.fx.reduceFlash}
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.reducedMotion}
          onChange={(e) => fx.set({ reducedMotion: e.target.checked })}
        />
        {vi.fx.reducedMotion}
      </label>
      {usage && usage.quota > 0 && (
        <p className="panel-note">
          {vi.album.usage}: {(usage.usage / 1e6).toFixed(1)} MB /{' '}
          {(usage.quota / 1e6).toFixed(0)} MB
          {usage.usage / usage.quota > 0.8 && (
            <b className="warn"> · {vi.album.nearlyFull}</b>
          )}
        </p>
      )}
    </div>
  )
}
