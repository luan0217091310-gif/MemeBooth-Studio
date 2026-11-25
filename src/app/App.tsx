import { lazy, Suspense, useEffect, type CSSProperties } from 'react'
import {
  ArrowLeft,
  CircleHelp,
  FlipHorizontal2,
  Hand,
  LockKeyhole,
  Power,
  ShieldCheck,
  Sparkles,
  Sun,
  SwitchCamera,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { DebugPanel } from '@/components/common/DebugPanel'
import { VibeChip } from '@/components/controls/VibePicker'
import { artwork } from '@/config/assets'
import { vibes } from '@/config/vibes'
import { setMuted, unlockAudio } from '@/core/audio/engine'
import { getStageEngine } from '@/core/engineRef'
import { startSettingsSync } from '@/core/storage/settingsSync'
import { useAlbum } from '@/store/album'
import { useFx, type RingLightMode } from '@/store/fx'
import { useScene } from '@/store/scene'
import { useSession } from '@/store/session'
import { useStage } from '@/store/stage'
import { useUi } from '@/store/ui'
import { useVibe } from '@/store/vibe'
import { vi } from '@/i18n/vi'

// The live stage (camera, AI, canvas, capture...) is a separate chunk so the
// home screen loads fast; it is fetched when the user presses Start.
const LiveStage = lazy(() => import('./LiveStage'))
const preloadLiveStage = () => void import('./LiveStage')

function ModeChip() {
  const mode = useScene((s) => s.mode)
  const setMode = useScene((s) => s.setMode)
  return (
    <div className="mode-chip" role="radiogroup" aria-label={vi.draw.mode}>
      {(['meme', 'draw'] as const).map((m) => (
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

const RING_ORDER: readonly RingLightMode[] = ['off', 'white', 'pink', 'warm']

function QuickHeaderControls() {
  const mirror = useStage((s) => s.mirror)
  const facing = useStage((s) => s.facing)
  const camera = useStage((s) => s.camera)
  const setStage = useStage((s) => s.set)
  const muted = useFx((s) => s.muted)
  const ringLight = useFx((s) => s.ringLight)
  const handShutter = useFx((s) => s.handShutter)
  const setFx = useFx((s) => s.set)
  const nextRing = () => {
    const i = RING_ORDER.indexOf(ringLight)
    setFx({ ringLight: RING_ORDER[(i + 1) % RING_ORDER.length]! })
  }
  return (
    <>
      {camera === 'live' && (
        <button
          className={
            'chip icon-chip ' + (facing === 'environment' ? 'lit-on' : '')
          }
          aria-label={vi.fx.switchCamera}
          aria-pressed={facing === 'environment'}
          title={
            vi.fx.switchCamera +
            ' (' +
            (facing === 'user' ? vi.fx.frontCamera : vi.fx.rearCamera) +
            ')'
          }
          onClick={() => void getStageEngine()?.switchCamera()}
        >
          <SwitchCamera size={16} />
        </button>
      )}
      <button
        className={'chip icon-chip ' + (handShutter ? 'lit-on' : '')}
        aria-label={vi.fx.handShutter}
        aria-pressed={handShutter}
        title={vi.fx.handShutter}
        onClick={() => setFx({ handShutter: !handShutter })}
      >
        <Hand size={16} />
      </button>
      <button
        className={'chip icon-chip ' + (ringLight !== 'off' ? 'lit-on' : '')}
        aria-label={
          vi.fx.ringLight + ': ' + (vi.fx.ringModes[ringLight] ?? ringLight)
        }
        aria-pressed={ringLight !== 'off'}
        title={
          vi.fx.ringLight + ': ' + (vi.fx.ringModes[ringLight] ?? ringLight)
        }
        onClick={nextRing}
      >
        <Sun size={16} />
      </button>
      <button
        className={'chip icon-chip ' + (mirror ? 'on' : '')}
        aria-label={vi.fx.mirror}
        aria-pressed={mirror}
        title={vi.fx.mirror}
        onClick={() => {
          const next = !mirror
          setStage({ mirror: next })
          getStageEngine()?.setMirror(next)
        }}
      >
        <FlipHorizontal2 size={16} />
      </button>
      <button
        className={'chip icon-chip ' + (muted ? '' : 'on')}
        aria-label={muted ? vi.fx.soundOn : vi.fx.soundOff}
        aria-pressed={!muted}
        title={muted ? vi.fx.soundOn : vi.fx.soundOff}
        onClick={() => {
          const next = !muted
          setMuted(next)
          setFx({ muted: next })
        }}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </>
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

function LiteChip() {
  const liteMode = useFx((s) => s.liteMode)
  const setFx = useFx((s) => s.set)
  return (
    <button
      className={'chip lite-chip ' + (liteMode ? 'on' : '')}
      aria-pressed={liteMode}
      title={vi.fx.liteModeNote}
      onClick={() => setFx({ liteMode: !liteMode })}
    >
      <Zap size={15} />
      <span>{vi.fx.liteChip}</span>
    </button>
  )
}

export function App() {
  const { started, setStarted, debug, setDebug, offline } = useSession()
  const preset = useVibe((s) => s.preset)
  const liteMode = useFx((s) => s.liteMode)
  useEffect(() => {
    void startSettingsSync((s) => {
      if (s.muted) {
        setMuted(true)
        useFx.getState().set({ muted: true })
      }
      if (s.mirror === false) useStage.getState().set({ mirror: false })
    }).catch(() => undefined)
  }, [])
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
    void useAlbum
      .getState()
      .refresh()
      .catch(() => undefined)
    setStarted(true)
  }

  return (
    <main
      className={'studio ' + (started ? 'is-live' : 'is-home')}
      data-vibe={preset.id}
      data-lite={liteMode ? 'true' : undefined}
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
            <LiteChip />
            <QuickHeaderControls />
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
            aria-keyshortcuts="D"
          >
            <CircleHelp size={19} />
            <span>{vi.settings}</span>
            <kbd aria-hidden>D</kbd>
          </button>
        </div>
      </header>
      {!started ? (
        <section className="stage home" aria-label={vi.stage}>
          <div className="frame">
            <div className="ambient-orbs" aria-hidden="true" />
            <div className="welcome">
              <div className="copy">
                <p className="intro">
                  <Sparkles size={16} aria-hidden />
                  {vi.intro}
                </p>
                <h1>
                  {vi.title[0]}
                  <br />
                  <em>
                    {vi.title[1]}
                    <span aria-hidden="true">✦</span>
                  </em>
                </h1>
                <ul className="hero-badges" aria-label={vi.intro}>
                  {vi.heroBadges.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
                <div className="hero-cta-row">
                  <button
                    className="primary"
                    onClick={start}
                    onPointerEnter={preloadLiveStage}
                    onFocus={preloadLiveStage}
                  >
                    <Power size={21} />
                    {vi.start}
                  </button>
                  <div className="home-vibes" aria-label={vi.tryVibe}>
                    <span>{vi.tryVibe}</span>
                    <div className="home-vibe-dots">
                      {vibes.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className={
                            'home-vibe-dot ' +
                            (preset.id === v.id ? 'on' : '')
                          }
                          title={v.name}
                          aria-label={v.name}
                          aria-pressed={preset.id === v.id}
                          style={{
                            background: `linear-gradient(135deg, ${v.ui['--mb-accent']}, ${v.ui['--mb-accent-2']})`,
                          }}
                          onClick={() => useVibe.getState().setVibe(v.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="privacy-line">
                  <LockKeyhole size={15} />
                  {vi.privacy}
                </p>
              </div>
              <div className="hero-visual">
                <img className="illustration" src={artwork.booth} alt="" />
              </div>
            </div>
            <div className="bento-grid">
              {vi.bento.map((card) => (
                <article key={card.title} className="bento-card">
                  <span className="bento-icon" aria-hidden>
                    {card.icon}
                  </span>
                  <div>
                    <h2>{card.title}</h2>
                    <p>{card.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <Suspense
          fallback={<section className="stage live" aria-busy="true" />}
        >
          <LiveStage />
        </Suspense>
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
