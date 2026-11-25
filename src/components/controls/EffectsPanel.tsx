import { Shuffle, Trash2 } from 'lucide-react'
import { props } from '@/config/props'
import { getStageEngine } from '@/components/stage/CameraStage'
import { useFx } from '@/store/fx'
import { useAlbum } from '@/store/album'
import { useStage } from '@/store/stage'
import { ShareSettings } from '@/components/common/ShareModal'
import { useEffect } from 'react'
import { vi } from '@/i18n/vi'

const propUrl = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

/** AR props picker with quick randomizer & clear. */
export function PropsPanel() {
  const active = useFx((s) => s.activeProps)
  const toggle = useFx((s) => s.toggleProp)
  const setFx = useFx((s) => s.set)
  const randomize = () => {
    const headProps = props.filter((p) => p.anchor === 'forehead')
    const faceProps = props.filter((p) => p.anchor !== 'forehead')
    const a = headProps[Math.floor(Math.random() * headProps.length)]!
    const b = faceProps[Math.floor(Math.random() * faceProps.length)]!
    setFx({ activeProps: [a.id, b.id] })
  }
  return (
    <div className="panel-body">
      <p className="panel-note">{vi.fx.propsNote}</p>
      <div className="panel-actions">
        <button type="button" className="ghost small-btn" onClick={randomize}>
          <Shuffle size={14} />
          {vi.fx.randomProps}
        </button>
        {active.length > 0 && (
          <button
            type="button"
            className="ghost small-btn"
            onClick={() => setFx({ activeProps: [] })}
          >
            <Trash2 size={14} />
            {vi.fx.clearProps}
          </button>
        )}
      </div>
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
  const mirror = useStage((s) => s.mirror)
  const setStage = useStage((s) => s.set)
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
          checked={fx.liteMode}
          onChange={(e) => fx.set({ liteMode: e.target.checked })}
        />
        {vi.fx.liteMode}
      </label>
      <p className="panel-note">{vi.fx.liteModeNote}</p>
      <label className="switch">
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => {
            setStage({ mirror: e.target.checked })
            engine()?.setMirror(e.target.checked)
          }}
        />
        {vi.fx.mirror}
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.handShutter}
          onChange={(e) => fx.set({ handShutter: e.target.checked })}
        />
        {vi.fx.handShutter}
      </label>
      <p className="panel-note">{vi.fx.handShutterNote}</p>
      <label className="switch">
        <input
          type="checkbox"
          checked={fx.showSkeleton}
          onChange={(e) => fx.set({ showSkeleton: e.target.checked })}
        />
        {vi.fx.showSkeleton}
      </label>
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
      <h3 className="panel-sub">{vi.share.title}</h3>
      <ShareSettings />
    </div>
  )
}
