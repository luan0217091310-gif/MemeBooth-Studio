import { useEffect, useRef } from 'react'
import { StageEngine } from '@/core/canvas/stageEngine'
import { useStage } from '@/store/stage'
import { PermissionModal } from '@/components/common/PermissionModal'
import { LoadingProgress } from '@/components/common/LoadingProgress'
import { vi } from '@/i18n/vi'

let activeEngine: StageEngine | null = null
/** Imperative access for UI controls outside the stage (debug, settings). */
export function getStageEngine(): StageEngine | null {
  return activeEngine
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

  useEffect(() => {
    const engineInstance = new StageEngine({
      root: root.current!,
      layers: layers.current!,
      video: video.current!,
      camera: camera.current!,
      creative: creative.current!,
      fx: fx.current!,
      hud: hud.current!,
    })
    engine.current = engineInstance
    activeEngine = engineInstance
    void engineInstance.startCamera()
    return () => {
      engineInstance.dispose()
      if (activeEngine === engineInstance) activeEngine = null
      engine.current = null
      useStage.getState().set({ camera: 'idle', vision: 'idle', progress: 0 })
    }
  }, [])

  return (
    <div className="camera-stage" ref={root} data-camera={status}>
      <video
        ref={video}
        className="camera-video"
        muted
        playsInline
        aria-hidden
      />
      <div ref={layers} className="layer-stack">
        <canvas ref={camera} className="layer" data-layer="0" />
        <canvas ref={creative} className="layer" data-layer="1" />
        <canvas ref={fx} className="layer" data-layer="2" />
      </div>
      <canvas ref={hud} className="layer hud" data-layer="3" aria-hidden />
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
