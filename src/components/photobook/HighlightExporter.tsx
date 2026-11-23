import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import type { RecordResult } from '@/core/audio/recorder'
import { captureFilename, downloadBlob } from '@/core/capture/filename'
import type { ReelFormat } from '@/core/capture/highlightReel'
import type { StoredPage } from '@/core/storage/repo'
import type { VibePreset } from '@/types'
import { vi } from '@/i18n/vi'

type State =
  | { kind: 'setup' }
  | { kind: 'rendering'; progress: number }
  | { kind: 'done'; result: RecordResult; url: string }
  | { kind: 'error'; message: string }

/** Renders the last 4 moments into a reel (lazy-loads the renderer). */
export function HighlightExporter(props: {
  pages: StoredPage[]
  vibe: VibePreset
  onClose(): void
}) {
  const [format, setFormat] = useState<ReelFormat>('9:16')
  const [state, setState] = useState<State>({ kind: 'setup' })
  const abort = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      abort.current?.abort()
    },
    [],
  )
  useEffect(() => {
    if (state.kind !== 'done') return
    return () => URL.revokeObjectURL(state.url)
  }, [state])
  useEffect(() => {
    // Rendering needs a visible tab (requestAnimationFrame stops when hidden).
    const onHidden = () => {
      if (document.hidden && abort.current) {
        abort.current.abort()
        setState({ kind: 'error', message: vi.reel.hidden })
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [])

  async function start() {
    const { renderReel, ReelCancelled } =
      await import('@/core/capture/highlightReel')
    const moments = props.pages.slice(-4).map((p) => ({
      photo: p.poster ?? p.photo,
      clip: p.liveClip,
      soundIds: p.soundIds,
    }))
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ kind: 'rendering', progress: 0 })
    try {
      const result = await renderReel(
        moments,
        props.vibe,
        format,
        (progress) =>
          setState((s) =>
            s.kind === 'rendering' ? { kind: 'rendering', progress } : s,
          ),
        ctrl.signal,
      )
      setState({ kind: 'done', result, url: URL.createObjectURL(result.blob) })
    } catch (e) {
      if (e instanceof ReelCancelled)
        setState((s) => (s.kind === 'error' ? s : { kind: 'setup' }))
      else setState({ kind: 'error', message: vi.reel.failed })
    } finally {
      abort.current = null
    }
  }

  return (
    <div
      className="review"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reel-title"
    >
      <div className="review-card reel-card">
        <header>
          <h2 id="reel-title">{vi.reel.title}</h2>
          <button
            className="round"
            aria-label={vi.close}
            onClick={props.onClose}
          >
            <X size={18} />
          </button>
        </header>
        {state.kind === 'setup' && (
          <>
            <p className="panel-note">{vi.reel.note}</p>
            <div className="segmented" role="radiogroup">
              {(['9:16', '16:9'] as const).map((f) => (
                <button
                  key={f}
                  role="radio"
                  aria-checked={format === f}
                  className={format === f ? 'on' : ''}
                  onClick={() => setFormat(f)}
                >
                  {f === '9:16' ? vi.reel.vertical : vi.reel.horizontal}
                </button>
              ))}
            </div>
            <div className="card-actions">
              <button className="primary" onClick={() => void start()}>
                {vi.reel.render}
              </button>
            </div>
          </>
        )}
        {state.kind === 'rendering' && (
          <>
            <p>{vi.reel.rendering}</p>
            <progress
              max={1}
              value={state.progress}
              aria-label={vi.reel.rendering}
            />
            <div className="card-actions">
              <button className="ghost" onClick={() => abort.current?.abort()}>
                {vi.capture.cancel}
              </button>
            </div>
          </>
        )}
        {state.kind === 'done' && (
          <>
            <video
              className="review-img"
              src={state.url}
              controls
              playsInline
            />
            <div className="card-actions">
              <button
                className="primary"
                onClick={() =>
                  downloadBlob(
                    state.result.blob,
                    captureFilename(state.result.ext),
                  )
                }
              >
                <Download size={18} /> {vi.capture.video}
              </button>
            </div>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <p className="panel-note warn">{state.message}</p>
            <div className="card-actions">
              <button
                className="ghost"
                onClick={() => setState({ kind: 'setup' })}
              >
                {vi.vision.retry}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
