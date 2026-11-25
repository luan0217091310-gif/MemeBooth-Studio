import { Camera, Square, Timer, Trophy, Video, X } from 'lucide-react'
import { getStageEngine } from '@/components/stage/CameraStage'
import { layoutOrder, layouts } from '@/core/capture/layouts'
import { useCapture } from '@/store/capture'
import { useChallenge } from '@/store/challenge'
import { vi } from '@/i18n/vi'

const TIMERS: readonly (3 | 1 | 0)[] = [3, 1, 0]

/**
 * Smart Floating Dock: layout, timer, and primary capture actions.
 * While capturing it turns into context controls (Stop / Cancel).
 */
export function FloatingDock() {
  const { phase, layout, countdownSec, set, shot, total } = useCapture()
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
  const nextLayout = () => {
    const i = layoutOrder.indexOf(layout)
    set({ layout: layoutOrder[(i + 1) % layoutOrder.length]! })
  }
  const nextTimer = () => {
    const i = TIMERS.indexOf(countdownSec)
    set({ countdownSec: TIMERS[(i + 1) % TIMERS.length]! })
  }
  const timerText = countdownSec === 0 ? vi.capture.instant : countdownSec + 's'
  return (
    <div className="dock" role="toolbar" aria-label={vi.dock.label}>
      <button
        className="dock-layout"
        data-dwell
        onClick={nextLayout}
        aria-label={vi.capture.layout + ': ' + layouts[layout].name}
      >
        <small>{vi.capture.layout}</small>
        <b>{layouts[layout].name}</b>
      </button>
      <button
        className="dock-timer"
        data-dwell
        onClick={nextTimer}
        aria-label={vi.capture.timer + ': ' + timerText}
        title={vi.capture.timer}
      >
        <Timer size={16} />
        <b>{timerText}</b>
      </button>
      <button
        className="dock-btn shutter-btn"
        data-dwell
        onClick={() => void capture()?.startPhoto()}
      >
        <Camera size={24} />
        <span>{vi.dock.photo}</span>
        <kbd>Space</kbd>
      </button>
      <button
        className="dock-btn"
        data-dwell
        onClick={() => capture()?.startVideo()}
      >
        <Video size={22} />
        <span>{vi.dock.video}</span>
        <kbd>R</kbd>
      </button>
      <button
        className="dock-btn"
        data-dwell
        onClick={() => getStageEngine()?.challengeCtl.open()}
      >
        <Trophy size={22} />
        <span>{vi.dock.challenge}</span>
      </button>
    </div>
  )
}
