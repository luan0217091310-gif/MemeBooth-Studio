import { useEffect, useRef, useState } from 'react'
import { Copy, ExternalLink, X } from 'lucide-react'
import { StageEngine } from '@/core/canvas/stageEngine'
import { getStageEngine, setStageEngine } from '@/core/engineRef'
import { useFx } from '@/store/fx'
import { useScene } from '@/store/scene'
import { useStage } from '@/store/stage'
import { useUi } from '@/store/ui'
import { PermissionModal } from '@/components/common/PermissionModal'
import { LoadingProgress } from '@/components/common/LoadingProgress'
import { vi } from '@/i18n/vi'

export { getStageEngine } from '@/core/engineRef'

function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Zalo|FBAN|FBAV|FBIOS|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|BytedanceWebview/i.test(
    navigator.userAgent,
  )
}

export function CameraStage() {
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const layers = useRef<HTMLDivElement>(null)
  const camera = useRef<HTMLCanvasElement>(null)
  const creative = useRef<HTMLCanvasElement>(null)
  const fx = useRef<HTMLCanvasElement>(null)
  const hud = useRef<HTMLCanvasElement>(null)
  const engine = useRef<StageEngine | null>(null)
  const status = useStage((s) => s.camera)
  const mode = useScene((s) => s.mode)
  const ringLight = useFx((s) => s.ringLight)
  const [fsBlocked, setFsBlocked] = useState(false)
  const [inAppDismissed, setInAppDismissed] = useState(false)
  const inApp = isInAppBrowser()

  useEffect(() => {
    const v = video.current!
    // Apply iOS/WKWebView inline playback attributes BEFORE opening getUserMedia.
    v.setAttribute('playsinline', 'true')
    v.setAttribute('webkit-playsinline', 'true')
    v.setAttribute('x5-playsinline', 'true')
    v.setAttribute('x-webkit-airplay', 'deny')
    v.setAttribute('disablepictureinpicture', 'true')
    v.muted = true
    v.playsInline = true
    v.controls = false

    const onEndFullscreen = () => {
      // iOS in-app browsers (e.g. Zalo/FB WKWebView with allowsInlineMediaPlayback=NO)
      // force native fullscreen and pause the <video> upon exit.
      setFsBlocked(true)
    }
    const onPlay = () => setFsBlocked(false)
    v.addEventListener('webkitendfullscreen', onEndFullscreen)
    v.addEventListener('play', onPlay)

    const engineInstance = new StageEngine({
      root: root.current!,
      layers: layers.current!,
      video: v,
      camera: camera.current!,
      creative: creative.current!,
      fx: fx.current!,
      hud: hud.current!,
    })
    engine.current = engineInstance
    setStageEngine(engineInstance)
    // Restore the persisted mirror setting before the first frame.
    engineInstance.setMirror(useStage.getState().mirror)
    void engineInstance.startCamera()
    return () => {
      v.removeEventListener('webkitendfullscreen', onEndFullscreen)
      v.removeEventListener('play', onPlay)
      engineInstance.dispose()
      if (getStageEngine() === engineInstance) setStageEngine(null)
      engine.current = null
      useStage.getState().set({ camera: 'idle', vision: 'idle', progress: 0 })
    }
  }, [])

  const copyPageLink = () => {
    void navigator.clipboard
      ?.writeText(location.href)
      .then(() =>
        useUi.getState().showToast({ text: vi.camera.linkCopied, ttl: 3000 }),
      )
      .catch(() => undefined)
  }

  return (
    <div
      className="camera-stage"
      ref={root}
      data-camera={status}
      data-mode={mode}
      data-ring={ringLight}
    >
      <video
        ref={video}
        className="camera-video"
        muted
        playsInline
        disablePictureInPicture
        aria-hidden
      />
      <div ref={layers} className="layer-stack">
        <canvas ref={camera} className="layer" data-layer="0" />
        <canvas ref={creative} className="layer" data-layer="1" />
        <canvas ref={fx} className="layer" data-layer="2" />
      </div>
      <canvas ref={hud} className="layer hud" data-layer="3" aria-hidden />
      {inApp && !inAppDismissed && !fsBlocked && (
        <div className="inapp-banner" role="status">
          <ExternalLink size={15} />
          <span>{vi.camera.inAppTip}</span>
          <button
            type="button"
            className="ghost small-btn"
            onClick={copyPageLink}
          >
            <Copy size={13} />
            {vi.camera.copyLink}
          </button>
          <button
            type="button"
            className="round"
            aria-label={vi.close}
            onClick={() => setInAppDismissed(true)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {fsBlocked && (
        <div className="stage-card" role="dialog" aria-labelledby="ios-fs-title">
          <h2 id="ios-fs-title">{vi.camera.inAppBlockedTitle}</h2>
          <p>{vi.camera.inAppBlockedBody}</p>
          <div className="card-actions">
            <button type="button" className="primary" onClick={copyPageLink}>
              <Copy size={17} />
              {vi.camera.copyLink}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setFsBlocked(false)
                void video.current?.play().catch(() => undefined)
              }}
            >
              {vi.camera.resumeVideo}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => setFsBlocked(false)}
            >
              {vi.close}
            </button>
          </div>
        </div>
      )}
      {status === 'requesting' && (
        <p className="stage-note" role="status">
          {vi.camera.requesting}
        </p>
      )}
      {(status === 'error' || status === 'ended') && (
        <PermissionModal
          onRetry={() => void engine.current?.startCamera()}
          onSkip={() => engine.current?.useWithoutCamera()}
        />
      )}
      <LoadingProgress
        onRetry={() => engine.current?.startVision('GPU')}
        onCpu={() => engine.current?.startVision('CPU')}
        onSkip={() => engine.current?.useWithoutCamera()}
      />
    </div>
  )
}
