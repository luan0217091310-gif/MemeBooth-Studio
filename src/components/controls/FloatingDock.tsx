import { Camera, Square, Trophy, Video, X } from 'lucide-react'
import { getStageEngine } from '@/components/stage/CameraStage'
import { layoutOrder, layouts } from '@/core/capture/layouts'
import { useCapture } from '@/store/capture'
import { useChallenge } from '@/store/challenge'
import { vi } from '@/i18n/vi'

/**
 * Smart Floating Dock: three primary actions. While capturing it turns into
 * context controls (Stop / Cancel). The Challenge button ships in phase 7 and
 * stays visibly disabled until then.
 */
export function FloatingDock() {
  const { phase, layout, set, shot, total } = useCapture()
  const capture = () => getStageEngine()?.capture
  const chPhase = useChallenge((s) => s.phase)
  // During a challenge round the challenge HUD owns the dock.
  if (chPhase === 'turn' || chPhase === 'between') return null
  if (phase === 'photo' || phase === 'composing')
    return (
      <div className="dock" role="toolbar" aria-label={vi.dock.label}>
        <span className="dock-status">
          {phase === 'composing'
            ? vi.capture.composing
            : vi.capture.shot + ' ' + shot + '/' + total}
        </span>
        <button
          className="dock-btn danger"
          data-dwell
          onClick={() => capture()?.cancel()}
        >
          <X size={24} />
          <span>{vi.capture.cancel}</span>
        </button>
      </div>
    )
  if (phase === 'recording')
    return (
      <div className="dock" role="toolbar" aria-label={vi.dock.label}>
        <button
          className="dock-btn danger"
          data-dwell
          onClick={() => void capture()?.stopVideo()}
        >
          <Square size={24} />
          <span>{vi.capture.stop}</span>
        </button>
      </div>
    )
  const next = () => {
    const i = layoutOrder.indexOf(layout)
    set({ layout: layoutOrder[(i + 1) % layoutOrder.length]! })
  }
  return (
    <div className="dock" role="toolbar" aria-label={vi.dock.label}>
      <button
        className="dock-layout"
        data-dwell
        onClick={next}
        aria-label={vi.capture.layout + ': ' + layouts[layout].name}
      >
        <small>{vi.capture.layout}</small>
        <b>{layouts[layout].name}</b>
      </button>
      <button
        className="dock-btn"
        data-dwell
        onClick={() => void capture()?.startPhoto()}
      >
        <Camera size={26} />
        <span>{vi.dock.photo}</span>
        <kbd>Space</kbd>
      </button>
      <button
        className="dock-btn"
        data-dwell
        onClick={() => capture()?.startVideo()}
      >
        <Video size={26} />
        <span>{vi.dock.video}</span>
        <kbd>R</kbd>
      </button>
      <button
        className="dock-btn"
        data-dwell
        onClick={() => getStageEngine()?.challengeCtl.open()}
      >
        <Trophy size={26} />
        <span>{vi.dock.challenge}</span>
      </button>
    </div>
  )
}
