import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getStageEngine } from '@/core/engineRef'
import { faceConfig, gestureConfig, smoothingConfig } from '@/config/gestures'
import { useSession } from '@/store/session'
import { useStage } from '@/store/stage'
import { vi } from '@/i18n/vi'

function PerfReadout() {
  const perf = useStage((s) => s.perf)
  const d = vi.debug
  return (
    <>
      <dt>{d.render}</dt>
      <dd data-testid="render-fps">
        {perf.fps.toFixed(0)} fps · p95 {perf.p95.toFixed(1)} ms
      </dd>
      <dt>{d.inference}</dt>
      <dd data-testid="inference-fps">
        {perf.inferenceFps} /s · {perf.inferenceMs.toFixed(1)} ms ·{' '}
        {perf.runBoth ? d.both : d.alternating}
      </dd>
      <dt>{d.runtime}</dt>
      <dd>
        {perf.runtime} · {d.delegate} {perf.delegate} · {d.renderer}{' '}
        {perf.renderer}
      </dd>
      <dt>{d.detected}</dt>
      <dd>
        {perf.hands} {d.hands}
        {perf.handLabels ? ' (' + perf.handLabels + ')' : ''} · {perf.faces}{' '}
        {d.faces}
      </dd>
    </>
  )
}

function Tuning() {
  const mirror = useStage((s) => s.mirror)
  const setStage = useStage((s) => s.set)
  const [minCutoff, setMinCutoff] = useState(smoothingConfig.minCutoff)
  const [beta, setBeta] = useState(smoothingConfig.beta)
  useEffect(() => {
    getStageEngine()?.tracker.setParams({ minCutoff, beta })
  }, [minCutoff, beta])
  return (
    <fieldset className="tuning">
      <label className="inline">
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => {
            setStage({ mirror: e.target.checked })
            getStageEngine()?.setMirror(e.target.checked)
          }}
        />
        {vi.debug.mirror}
      </label>
      <label>
        One Euro minCutoff {minCutoff.toFixed(2)}
        <input
          type="range"
          min={0.05}
          max={5}
          step={0.05}
          value={minCutoff}
          onChange={(e) => setMinCutoff(Number(e.target.value))}
        />
      </label>
      <label>
        One Euro beta {beta.toFixed(3)}
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.001}
          value={beta}
          onChange={(e) => setBeta(Number(e.target.value))}
        />
      </label>
    </fieldset>
  )
}

const BLENDSHAPES = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
  'browInnerUp',
  'cheekPuff',
]

function LiveValues() {
  const live = useStage((s) => s.live)
  const row = (k: string, v: number | undefined) => (
    <span key={k} style={{ display: 'contents' }}>
      <span>{k}</span>
      <span>{(v ?? 0).toFixed(2)}</span>
    </span>
  )
  return (
    <details className="tuning">
      <summary>{vi.debugLive.title}</summary>
      <b>{vi.debugLive.blendshapes}</b>
      <div className="live-table">
        {BLENDSHAPES.map((k) => row(k, live.blendshapes[k]))}
      </div>
      <b>{vi.debugLive.derived}</b>
      <div className="live-table">
        {Object.entries(live.derived).map(([k, v]) => row(k, v))}
      </div>
      <b>{vi.debugLive.triggers}</b>
      <div className="live-table">
        {Object.entries(live.scores).map(([k, v]) => row(k, v))}
      </div>
      <span>
        {vi.debugLive.particles}: {live.particles}
      </span>
    </details>
  )
}

/** Live threshold sliders (mutate the shared config objects in place). */
function Thresholds() {
  const [, force] = useState(0)
  const slider = (
    label: string,
    get: () => number,
    put: (v: number) => void,
    min = 0,
    max = 1,
  ) => (
    <label key={label}>
      {label} {get().toFixed(2)}
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={get()}
        onChange={(e) => {
          put(Number(e.target.value))
          force((n) => n + 1)
        }}
      />
    </label>
  )
  return (
    <details className="tuning">
      <summary>{vi.debugLive.thresholds}</summary>
      {slider(
        'PINCH enter',
        () => gestureConfig.pinchEnter,
        (v) => (gestureConfig.pinchEnter = v),
      )}
      {slider(
        'PINCH exit',
        () => gestureConfig.pinchExit,
        (v) => (gestureConfig.pinchExit = v),
      )}
      {slider(
        'Gesture active',
        () => gestureConfig.activeScore,
        (v) => (gestureConfig.activeScore = v),
      )}
      {slider(
        'MOUTH_OPEN enter',
        () => faceConfig.mouthOpen.enter,
        (v) => (faceConfig.mouthOpen.enter = v),
      )}
      {slider(
        'SMILE enter',
        () => faceConfig.smile.enter,
        (v) => (faceConfig.smile.enter = v),
      )}
      {slider(
        'PUCKER enter',
        () => faceConfig.pucker.enter,
        (v) => (faceConfig.pucker.enter = v),
      )}
      {slider(
        'BROW_UP enter',
        () => faceConfig.browUp.enter,
        (v) => (faceConfig.browUp.enter = v),
      )}
      {slider(
        'CHEEK_PUFF enter',
        () => faceConfig.cheekPuff.enter,
        (v) => (faceConfig.cheekPuff.enter = v),
      )}
      {slider(
        'WINK diff',
        () => faceConfig.winkDiff,
        (v) => (faceConfig.winkDiff = v),
      )}
    </details>
  )
}

export function DebugPanel() {
  const ref = useRef<HTMLDialogElement>(null)
  const { debug, setDebug, offline } = useSession()
  const [assets, setAssets] = useState<string>(vi.checking)
  useEffect(() => {
    if (!debug) {
      if (ref.current?.open) ref.current.close()
      return
    }
    // Non-modal so the stage stays visible and interactive while tuning.
    if (!ref.current?.open) ref.current?.show()
    const controller = new AbortController()
    fetch('./mediapipe/manifest.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status))
        const manifest: { version: string; files: unknown[] } =
          await response.json()
        setAssets(
          'MediaPipe ' +
            manifest.version +
            ' · ' +
            manifest.files.length +
            ' ' +
            vi.count,
        )
      })
      .catch(() => {
        if (!controller.signal.aborted) setAssets(vi.missing)
      })
    return () => controller.abort()
  }, [debug])
  return (
    <dialog
      ref={ref}
      className="debug"
      aria-labelledby="debug-title"
      onCancel={() => setDebug(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDebug(false)
      }}
    >
      <div className="dialog-head">
        <h2 id="debug-title">{vi.backstage}</h2>
        <button
          className="round"
          aria-label={vi.close}
          onClick={() => setDebug(false)}
        >
          <X size={20} />
        </button>
      </div>
      <dl>
        <dt>{vi.release}</dt>
        <dd>1.0 · {vi.milestone}</dd>
        <dt>{vi.model}</dt>
        <dd>{assets}</dd>
        <dt>{vi.offlineLabel}</dt>
        <dd>{vi.offline[offline]}</dd>
        {debug && <PerfReadout />}
      </dl>
      {debug && <Tuning />}
      {debug && <LiveValues />}
      {debug && <Thresholds />}
      {offline === 'unavailable' && <p>{vi.offlineTip}</p>}
    </dialog>
  )
}
