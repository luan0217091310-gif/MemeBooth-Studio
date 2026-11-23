import { CameraOff, MousePointer2, RefreshCw } from 'lucide-react'
import { useStage } from '@/store/stage'
import { vi } from '@/i18n/vi'

function browserHint(): string {
  const ua = navigator.userAgent
  if (/Firefox\//.test(ua)) return vi.camera.browserHelp.firefox
  if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua))
    return vi.camera.browserHelp.safari
  return vi.camera.browserHelp.chrome
}

export function PermissionModal(props: { onRetry(): void; onSkip(): void }) {
  const { camera, cameraError } = useStage()
  const ended = camera === 'ended'
  const message = ended
    ? vi.camera.ended
    : vi.camera.errors[cameraError ?? 'unknown']
  return (
    <div className="stage-card" role="alertdialog" aria-labelledby="perm-title">
      <CameraOff size={38} />
      <h2 id="perm-title">{ended ? vi.camera.ended : vi.camera.title}</h2>
      {!ended && <p>{message}</p>}
      {cameraError === 'denied' && !ended && (
        <p className="hint">{browserHint()}</p>
      )}
      <div className="card-actions">
        <button className="primary" onClick={props.onRetry}>
          <RefreshCw size={18} />
          {ended ? vi.camera.reconnect : vi.camera.retry}
        </button>
        <button className="ghost" onClick={props.onSkip}>
          <MousePointer2 size={18} />
          {vi.camera.noCamera}
        </button>
      </div>
    </div>
  )
}
