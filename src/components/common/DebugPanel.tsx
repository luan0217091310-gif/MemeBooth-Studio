import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useSession } from '@/store/session'
import { vi } from '@/i18n/vi'

export function DebugPanel() {
  const ref = useRef<HTMLDialogElement>(null)
  const { debug, setDebug, offline } = useSession()
  const [assets, setAssets] = useState<string>(vi.checking)
  useEffect(() => {
    if (!debug) {
      if (ref.current?.open) ref.current.close()
      return
    }
    ref.current?.showModal()
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
      aria-labelledby="debug-title"
      onCancel={() => setDebug(false)}
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
        <dd>0.1 · {vi.milestone}</dd>
        <dt>{vi.model}</dt>
        <dd>{assets}</dd>
        <dt>{vi.offlineLabel}</dt>
        <dd>{vi.offline[offline]}</dd>
      </dl>
      {offline === 'unavailable' && <p>{vi.offlineTip}</p>}
    </dialog>
  )
}
