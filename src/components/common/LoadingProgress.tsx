import { useEffect, useState } from 'react'
import { Cpu, MousePointer2, RefreshCw } from 'lucide-react'
import { useStage } from '@/store/stage'
import { vi } from '@/i18n/vi'

export function LoadingProgress(props: {
  onRetry(): void
  onCpu(): void
  onSkip(): void
}) {
  const { vision, progress, slowLoad } = useStage()
  const [tip, setTip] = useState(0)
  useEffect(() => {
    if (vision !== 'loading') return
    const id = window.setInterval(
      () => setTip((t) => (t + 1) % vi.vision.tips.length),
      3500,
    )
    return () => window.clearInterval(id)
  }, [vision])
  if (vision !== 'loading' && vision !== 'error') return null
  if (vision === 'error')
    return (
      <div className="stage-card compact" role="alert">
        <p>{vi.vision.error}</p>
        <div className="card-actions">
          <button className="primary" onClick={props.onRetry}>
            <RefreshCw size={18} />
            {vi.vision.retry}
          </button>
          <button className="ghost" onClick={props.onCpu}>
            <Cpu size={18} />
            {vi.vision.cpu}
          </button>
          <button className="ghost" onClick={props.onSkip}>
            <MousePointer2 size={18} />
            {vi.camera.noCamera}
          </button>
        </div>
      </div>
    )
  return (
    <div className="loading-pill" role="status">
      <span>
        {vi.vision.loading} · {progress}%
      </span>
      <progress max={100} value={progress} aria-label={vi.vision.loading} />
      <small>{vi.vision.tips[tip]}</small>
      {slowLoad && (
        <div className="card-actions">
          <span>{vi.vision.slow}</span>
          <button className="ghost" onClick={props.onRetry}>
            <RefreshCw size={16} />
            {vi.vision.retry}
          </button>
          <button className="ghost" onClick={props.onCpu}>
            <Cpu size={16} />
            {vi.vision.cpu}
          </button>
        </div>
      )}
    </div>
  )
}
