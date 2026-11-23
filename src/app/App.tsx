import { useEffect } from 'react'
import {
  Aperture,
  CameraOff,
  CircleHelp,
  Focus,
  LockKeyhole,
  Maximize,
  Power,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
import { DebugPanel } from '@/components/common/DebugPanel'
import { artwork } from '@/config/assets'
import { unlockAudio } from '@/core/audio/engine'
import { useSession } from '@/store/session'
import { vi } from '@/i18n/vi'

export function App() {
  const { started, setStarted, debug, setDebug, offline } = useSession()
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === 'd' &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault()
        setDebug(!useSession.getState().debug)
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [setDebug])
  function start() {
    void unlockAudio().catch(() => undefined)
    setStarted(true)
  }
  return (
    <main className="studio" data-vibe="kawaii">
      <header className="mast">
        <div className="brand">
          <img width="39" height="39" src="./booth.svg" alt="" />
          <span>
            MemeBooth <b>Studio</b>
          </span>
        </div>
        <button
          className="info"
          onClick={() => setDebug(!debug)}
          aria-label={vi.settings}
        >
          <CircleHelp size={19} />
          <span>{vi.settings}</span>
          <kbd>D</kbd>
        </button>
      </header>
      <section
        className={'stage ' + (started ? 'is-open' : '')}
        aria-label={vi.stage}
      >
        <div className="stage-bar">
          <span>
            <Aperture size={16} />
            {vi.stage}
          </span>
          <span>
            <CameraOff size={16} />
            {vi.cameraOff}
          </span>
        </div>
        <div className="frame">
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          {!started ? (
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
              </div>
              <img className="illustration" src={artwork.booth} alt="" />
            </div>
          ) : (
            <div className="session">
              <Focus size={62} strokeWidth={1.4} />
              <h1>{vi.ready}</h1>
              <p>{vi.phase}</p>
              <button className="primary" onClick={() => setStarted(false)}>
                {vi.back}
              </button>
            </div>
          )}
        </div>
        <div className="stage-foot">
          <span>
            <ScanLine size={16} />
            {vi.preview}
          </span>
          <Maximize aria-hidden size={16} />
        </div>
      </section>
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
      <DebugPanel />
    </main>
  )
}
