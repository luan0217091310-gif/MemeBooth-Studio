import { useEffect, useState } from 'react'
import { Copy, Download, Film, RotateCcw, X } from 'lucide-react'
import { getStageEngine } from '@/components/stage/CameraStage'
import {
  canvasToBlob,
  captureFilename,
  downloadBlob,
} from '@/core/capture/filename'
import { useCapture } from '@/store/capture'
import { useUi } from '@/store/ui'
import { isQuotaError, useAlbum } from '@/store/album'
import { useVibe } from '@/store/vibe'
import type { NewPage } from '@/core/storage/repo'
import { BookHeart, Share2 } from 'lucide-react'
import { useShare } from '@/store/share'
import { vi } from '@/i18n/vi'

/** Big 3-2-1 digits. DOM overlay: never part of the compositor output. */
export function CountdownOverlay() {
  const count = useCapture((s) => s.count)
  if (count === null) return null
  return (
    <div className="countdown" aria-live="assertive" key={count}>
      {count}
    </div>
  )
}

/** Red dot + timer while recording (screen only). */
export function RecordingBadge() {
  const { phase, recStartedAt, maxVideoMs } = useCapture()
  const [, tick] = useState(0)
  useEffect(() => {
    if (phase !== 'recording') return
    const id = window.setInterval(() => tick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [phase])
  if (phase !== 'recording') return null
  const s = Math.floor((performance.now() - recStartedAt) / 1000)
  const fmt = (n: number) =>
    Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0')
  return (
    <div className="rec-badge" role="status">
      <i aria-hidden /> {vi.capture.rec} {fmt(s)} / {fmt(maxVideoMs / 1000)}
    </div>
  )
}

function ClipPreview({ blob, poster }: { blob: Blob; poster: Blob }) {
  const [urls, setUrls] = useState<{ v: string; p: string } | null>(null)
  useEffect(() => {
    const v = URL.createObjectURL(blob)
    const p = URL.createObjectURL(poster)
    setUrls({ v, p })
    return () => {
      URL.revokeObjectURL(v)
      URL.revokeObjectURL(p)
    }
  }, [blob, poster])
  if (!urls) return null
  return <video src={urls.v} poster={urls.p} muted loop playsInline autoPlay />
}

export function CaptureReview() {
  const { phase, photo, video } = useCapture()
  const [gifBusy, setGifBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => setSaved(false), [photo, video])
  const saveTo = async (page: NewPage, newBook: boolean) => {
    try {
      await useAlbum.getState().save(page, useVibe.getState().vibeId, newBook)
      setSaved(true)
      useUi.getState().showToast({
        text: vi.capture.saved,
        actionLabel: vi.album.open,
        action: () => useUi.getState().setBookOpen(true),
        ttl: 5000,
      })
    } catch (e) {
      useUi.getState().showToast({
        text: isQuotaError(e) ? vi.album.quota : vi.capture.failed,
        ttl: 7000,
      })
    }
  }
  const close = () => getStageEngine()?.capture.closeReview()
  const fail = () =>
    useUi.getState().showToast({ text: vi.capture.failed, ttl: 4000 })

  if (phase === 'review' && photo) {
    const jpeg = async () => {
      const img = new Image()
      img.src = photo.url
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0)
      downloadBlob(
        await canvasToBlob(c, 'image/jpeg', 0.86),
        captureFilename('jpg'),
      )
    }
    const gif = async () => {
      setGifBusy(true)
      try {
        const { encodeGif } = await import('@/core/capture/gif')
        downloadBlob(await encodeGif(photo.shots), captureFilename('gif'))
      } catch {
        fail()
      } finally {
        setGifBusy(false)
      }
    }
    const copyImage = async () => {
      try {
        if (
          typeof ClipboardItem === 'undefined' ||
          !navigator.clipboard?.write
        ) {
          useUi.getState().showToast({ text: vi.capture.copyFailed, ttl: 4000 })
          return
        }
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': photo.png }),
        ])
        useUi.getState().showToast({ text: vi.capture.copied, ttl: 3000 })
      } catch {
        useUi.getState().showToast({ text: vi.capture.copyFailed, ttl: 4000 })
      }
    }
    return (
      <div
        className="review"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
      >
        <div className="review-card">
          <header>
            <h2 id="review-title">{vi.capture.review}</h2>
            <button
              className="round"
              aria-label={vi.capture.close}
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          <div className="review-body">
            <img
              className="review-img"
              src={photo.url}
              alt={vi.capture.review}
            />
            {photo.clips.length > 0 && (
              <div className="review-clips">
                <h3 className="panel-sub">
                  <Film size={14} /> {vi.capture.liveClips}
                </h3>
                {photo.clips.map((c, i) => (
                  <ClipPreview key={i} blob={c.blob} poster={c.poster} />
                ))}
              </div>
            )}
          </div>
          <div className="card-actions">
            <button
              className="ghost"
              onClick={() => downloadBlob(photo.png, captureFilename('png'))}
            >
              <Download size={18} />
              {vi.capture.png}
            </button>
            <button className="ghost" onClick={() => void jpeg().catch(fail)}>
              {vi.capture.jpeg}
            </button>
            <button className="ghost" onClick={() => void copyImage()}>
              <Copy size={17} />
              {vi.capture.copy}
            </button>
            {photo.shots.length > 1 && (
              <button
                className="ghost"
                disabled={gifBusy}
                onClick={() => void gif()}
              >
                {gifBusy ? vi.capture.gifWorking : vi.capture.gif}
              </button>
            )}
            <button
              className="ghost"
              onClick={() => {
                close()
                void getStageEngine()?.capture.startPhoto()
              }}
            >
              <RotateCcw size={18} />
              {vi.capture.retake}
            </button>
            <button
              className="ghost"
              onClick={() =>
                useShare.getState().open(photo.png, captureFilename('png'))
              }
            >
              <Share2 size={18} />
              {vi.share.title}
            </button>
          </div>
          <div className="card-actions">
            <button
              className="primary"
              disabled={saved}
              onClick={() => {
                const last = photo.clips[photo.clips.length - 1]
                void saveTo(
                  {
                    kind: 'photo',
                    photo: photo.png,
                    liveClip: last?.blob,
                    poster: last?.poster,
                    soundIds: [
                      ...new Set(photo.clips.flatMap((c) => c.soundIds)),
                    ],
                    memeIds: [
                      ...new Set(photo.clips.flatMap((c) => c.memeIds)),
                    ],
                    caption: '',
                    layout: photo.layout,
                  },
                  false,
                )
              }}
            >
              <BookHeart size={18} />
              {saved ? vi.capture.saved : vi.capture.saveAlbum}
            </button>
            {!saved && (
              <button
                className="link"
                onClick={() => {
                  const last = photo.clips[photo.clips.length - 1]
                  void saveTo(
                    {
                      kind: 'photo',
                      photo: photo.png,
                      liveClip: last?.blob,
                      poster: last?.poster,
                      soundIds: [
                        ...new Set(photo.clips.flatMap((c) => c.soundIds)),
                      ],
                      memeIds: [
                        ...new Set(photo.clips.flatMap((c) => c.memeIds)),
                      ],
                      caption: '',
                      layout: photo.layout,
                    },
                    true,
                  )
                }}
              >
                {vi.capture.saveNewBook}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  if (phase === 'videoReview' && video)
    return (
      <div
        className="review"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
      >
        <div className="review-card">
          <header>
            <h2 id="review-title">{vi.capture.videoReview}</h2>
            <button
              className="round"
              aria-label={vi.capture.close}
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          <video className="review-img" src={video.url} controls playsInline />
          <p className="panel-note">
            {vi.capture.format}: {video.ext.toUpperCase()} ({video.mime}) ·{' '}
            {(video.durationMs / 1000).toFixed(1)}s
          </p>
          <div className="card-actions">
            <button
              className="primary"
              onClick={() =>
                downloadBlob(video.blob, captureFilename(video.ext))
              }
            >
              <Download size={18} />
              {vi.capture.video}
            </button>
            <button
              className="ghost"
              onClick={() =>
                useShare.getState().open(video.blob, captureFilename(video.ext))
              }
            >
              <Share2 size={18} />
              {vi.share.title}
            </button>
            <button className="ghost" onClick={close}>
              {vi.capture.close}
            </button>
          </div>
          <div className="card-actions">
            <button
              className="primary"
              disabled={saved || !video.poster}
              onClick={() =>
                video.poster &&
                void saveTo(
                  {
                    kind: 'video',
                    photo: video.poster,
                    liveClip: video.blob,
                    poster: video.poster,
                    soundIds: video.soundIds,
                    memeIds: video.memeIds,
                    caption: '',
                    layout: 'single',
                  },
                  false,
                )
              }
            >
              <BookHeart size={18} />
              {saved ? vi.capture.saved : vi.capture.saveAlbum}
            </button>
          </div>
        </div>
      </div>
    )
  return null
}
