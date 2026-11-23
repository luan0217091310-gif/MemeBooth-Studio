import { useEffect, type CSSProperties } from 'react'
import {
  ArrowLeft,
  CircleHelp,
  LockKeyhole,
  Power,
  ShieldCheck,
} from 'lucide-react'
import { DebugPanel } from '@/components/common/DebugPanel'
import { Toast } from '@/components/common/Toast'
import { QuickBar } from '@/components/controls/CreativeToolbar'
import { FloatingDock } from '@/components/controls/FloatingDock'
import { SideDrawer } from '@/components/controls/SideDrawer'
import { VibeChip } from '@/components/controls/VibePicker'
import { CameraStage } from '@/components/stage/CameraStage'
import { CoachMarks, StageHints } from '@/components/stage/CoachMarks'
import { GesturePills } from '@/components/stage/GesturePills'
import {
  CaptureReview,
  CountdownOverlay,
  RecordingBadge,
} from '@/components/stage/CaptureOverlays'
import { getStageEngine } from '@/components/stage/CameraStage'
import { useCapture } from '@/store/capture'
import { artwork } from '@/config/assets'
import { unlockAudio } from '@/core/audio/engine'
import { useScene } from '@/store/scene'
import { useSession } from '@/store/session'
import { useStage } from '@/store/stage'
import { useUi } from '@/store/ui'
import { useVibe } from '@/store/vibe'
import { vi } from '@/i18n/vi'

function ModeChip() {
  const mode = useScene((s) => s.mode)
  const setMode = useScene((s) => s.setMode)
  return (
    <div className="mode-chip" role="radiogroup" aria-label={vi.draw.mode}>
      {(['draw', 'meme'] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          className={mode === m ? 'on' : ''}
          data-dwell
          onClick={() => setMode(m)}
        >
          {m === 'draw' ? vi.draw.modeDraw : vi.draw.modeMeme}
        </button>
      ))}
    </div>
  )
}

function FpsBadge() {
  const fps = useStage((s) => s.perf.fps)
  const inf = useStage((s) => s.perf.inferenceFps)
  return (
    <span className="fps" aria-label={vi.header.fps}>
      {fps.toFixed(0)} / {inf} fps
    </span>
  )
}

export function App() {
  const { started, setStarted, debug, setDebug, offline } = useSession()
  const preset = useVibe((s) => s.preset)
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const phase = useCapture.getState().phase
        if (phase === 'photo' || phase === 'recording') {
          getStageEngine()?.capture.cancel()
          return
        }
        if (phase === 'review' || phase === 'videoReview') {
          getStageEngine()?.capture.closeReview()
          return
        }
        if (useSession.getState().debug) setDebug(false)
        else if (useUi.getState().drawer) useUi.getState().setDrawer(null)
        return
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (mod && (key === 'z' || key === 'y')) {
        event.preventDefault()
        if (key === 'y' || event.shiftKey) useScene.getState().redo()
        else useScene.getState().undo()
        return
      }
      if (mod || event.altKey || event.repeat) return
      const cap = getStageEngine()?.capture
      // Space on a focused button must still press that button.
      const onButton =
        event.target instanceof HTMLElement && !!event.target.closest('button')
      if (
        event.key === ' ' &&
        cap &&
        !onButton &&
        useSession.getState().started
      ) {
        event.preventDefault()
        if (useCapture.getState().phase === 'idle') void cap.startPhoto()
        return
      }
      if (key === 'r' && cap) {
        const phase = useCapture.getState().phase
        if (phase === 'recording') void cap.stopVideo()
        else if (phase === 'idle') cap.startVideo()
        return
      }
      if (key === 'm') {
        const scene = useScene.getState()
        scene.setMode(scene.mode === 'draw' ? 'meme' : 'draw')
      } else if (key === 'd') {
        event.preventDefault()
        setDebug(!useSession.getState().debug)
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [setDebug])

  function start() {
    // AudioContext must be created/resumed inside this user gesture.
    void unlockAudio().catch(() => undefined)
    setStarted(true)
  }

  return (
    <main
      className={'studio ' + (started ? 'is-live' : 'is-home')}
      data-vibe={preset.id}
      style={preset.ui as CSSProperties}
    >
      <header className="mast">
        <div className="brand">
          <img width="36" height="36" src="./booth.svg" alt="" />
          <span>
            MemeBooth <b>Studio</b>
          </span>
        </div>
        {started && (
          <div className="mast-center">
            <ModeChip />
            <VibeChip />
            {debug && <FpsBadge />}
          </div>
        )}
        <div className="mast-right">
          {started && (
            <button className="info" onClick={() => setStarted(false)}>
              <ArrowLeft size={18} />
              <span>{vi.back}</span>
            </button>
          )}
          <button
            className="info"
            onClick={() => setDebug(!debug)}
            aria-label={vi.settings}
          >
            <CircleHelp size={19} />
            <span>{vi.settings}</span>
            <kbd>D</kbd>
          </button>
        </div>
      </header>
      {!started ? (
        <section className="stage home" aria-label={vi.stage}>
          <div className="frame">
            <div className="welcome">
              <div className="copy">
                <p className="intro">{vi.intro}</p>
                <h1>
                  {vi.title[0]}
                  <br />
                  <em>
                    {vi.title[1]}
                    <span aria-hidden="true">✦</span>
                  </em>
                </h1>
                <button className="primary" onClick={start}>
                  <Power size={21} />
                  {vi.start}
                </button>
                <p className="privacy-line">
                  <LockKeyhole size={15} />
                  {vi.privacy}
                </p>
              </div>
              <img className="illustration" src={artwork.booth} alt="" />
            </div>
          </div>
        </section>
      ) : (
        <section className="stage live" aria-label={vi.stage}>
          <CameraStage />
          <QuickBar />
          <SideDrawer />
          <StageHints />
          <GesturePills />
          <FloatingDock />
          <CoachMarks />
          <CountdownOverlay />
          <RecordingBadge />
          <CaptureReview />
          <Toast />
        </section>
      )}
      {!started && (
        <footer>
          <span>
            <LockKeyhole size={16} />
            {vi.privacy}
          </span>
          <span role="status">
            <ShieldCheck size={17} />
            {vi.offline[offline]}
          </span>
        </footer>
      )}
      <DebugPanel />
    </main>
  )
}
