import { forwardRef, useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { playSound } from '@/core/audio/soundRegistry'
import { captureFilename, downloadBlob } from '@/core/capture/filename'
import type { StoredPage } from '@/core/storage/repo'
import { vi } from '@/i18n/vi'

/** Book cover (hard page) styled by the vibe's cover id. */
export const BookCover = forwardRef<
  HTMLDivElement,
  { title: string; cover: string; back?: boolean }
>(function BookCover({ title, cover, back }, ref) {
  return (
    <div ref={ref} className={'book-page cover ' + cover} data-density="hard">
      <div className="cover-inner">
        {back ? (
          <span className="cover-small">MemeBooth Studio</span>
        ) : (
          <h2>{title}</h2>
        )}
        {!back && <span className="cover-small">MemeBooth</span>}
      </div>
    </div>
  )
})

/**
 * Plays a page's live clip while the page is visible and its meme sound
 * once; releases every object URL when the page is hidden or unmounted.
 */
function LivePhotoPlayer({
  page,
  visible,
}: {
  page: StoredPage
  visible: boolean
}) {
  const [urls, setUrls] = useState<{
    photo: string
    clip?: string
    poster?: string
  } | null>(null)
  useEffect(() => {
    const photo = URL.createObjectURL(page.photo)
    const clip = page.liveClip ? URL.createObjectURL(page.liveClip) : undefined
    const poster = page.poster ? URL.createObjectURL(page.poster) : undefined
    setUrls({ photo, clip, poster })
    return () => {
      URL.revokeObjectURL(photo)
      if (clip) URL.revokeObjectURL(clip)
      if (poster) URL.revokeObjectURL(poster)
    }
  }, [page])
  useEffect(() => {
    // The meme sound plays once per reveal (playSound honours mute).
    if (visible && page.soundIds[0]) playSound(page.soundIds[0])
  }, [visible, page])
  if (!urls) return null
  return (
    <div className="page-media">
      <img src={urls.photo} alt={page.caption || vi.album.photo} />
      {urls.clip && visible && (
        <video
          className="live-clip"
          src={urls.clip}
          poster={urls.poster}
          muted
          loop
          playsInline
          autoPlay
          controls={page.kind === 'video'}
        />
      )}
    </div>
  )
}

interface PageProps {
  page: StoredPage | null
  number: number
  /** Media is loaded only near the current spread. */
  near: boolean
  visible: boolean
  onCaption(id: string, caption: string): void
  onDelete(id: string): void
}

export const BookPage = forwardRef<HTMLDivElement, PageProps>(function BookPage(
  { page, number, near, visible, onCaption, onDelete },
  ref,
) {
  const [caption, setCaption] = useState(page?.caption ?? '')
  useEffect(() => setCaption(page?.caption ?? ''), [page])
  return (
    <div ref={ref} className="book-page" data-density="soft">
      {page ? (
        <div className="page-inner">
          {near ? (
            <LivePhotoPlayer page={page} visible={visible} />
          ) : (
            <div className="page-media placeholder" />
          )}
          <input
            className="caption"
            value={caption}
            maxLength={80}
            placeholder={vi.album.captionPh}
            aria-label={vi.album.caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() =>
              caption !== page.caption && onCaption(page.id, caption)
            }
            onKeyDown={(e) => e.stopPropagation()}
          />
          <footer>
            <time>{new Date(page.createdAt).toLocaleString('vi-VN')}</time>
            <span className="page-actions">
              <button
                className="round"
                aria-label={vi.album.downloadPage}
                onClick={() =>
                  downloadBlob(
                    page.kind === 'video' && page.liveClip
                      ? page.liveClip
                      : page.photo,
                    captureFilename(
                      page.kind === 'video' ? 'webm' : 'png',
                      new Date(page.createdAt),
                    ),
                  )
                }
              >
                <Download size={14} />
              </button>
              <button
                className="round"
                aria-label={vi.album.deletePage}
                onClick={() => onDelete(page.id)}
              >
                <Trash2 size={14} />
              </button>
            </span>
            <span className="page-no">{number}</span>
          </footer>
        </div>
      ) : (
        <div className="page-inner blank" />
      )}
    </div>
  )
})
