import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Trash2,
  X,
} from 'lucide-react'
import { zipSync } from 'fflate'
import { playSound } from '@/core/audio/soundRegistry'
import { captureFilename, downloadBlob } from '@/core/capture/filename'
import {
  deleteBook,
  deletePage,
  getBook,
  getPage,
  updateCaption,
  type Book,
  type StoredPage,
} from '@/core/storage/repo'
import { vibeById } from '@/config/vibes'
import { useAlbum } from '@/store/album'
import { useUi } from '@/store/ui'
import { vi } from '@/i18n/vi'
import { BookCover, BookPage } from './BookPage'
import { FlipBook, type FlipBookHandle } from './FlipBook'
import { HighlightExporter } from './HighlightExporter'

const COVERS: Record<string, string> = {
  'cover-polka': 'cover-polka',
  'cover-chrome': 'cover-chrome',
  'cover-kraft': 'cover-kraft',
  'cover-metal': 'cover-metal',
}

const extOf = (b: Blob) =>
  b.type.includes('mp4')
    ? 'mp4'
    : b.type.includes('webm')
      ? 'webm'
      : b.type.includes('png')
        ? 'png'
        : 'jpg'

async function zipBook(book: Book, pages: StoredPage[]): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  for (const [i, p] of pages.entries()) {
    const n = String(i + 1).padStart(2, '0')
    files[n + '_' + p.kind + '.' + extOf(p.photo)] = new Uint8Array(
      await p.photo.arrayBuffer(),
    )
    if (p.liveClip)
      files[n + '_live.' + extOf(p.liveClip)] = new Uint8Array(
        await p.liveClip.arrayBuffer(),
      )
  }
  files['captions.txt'] = new TextEncoder().encode(
    book.title +
      '\n\n' +
      pages.map((p, i) => i + 1 + '. ' + (p.caption || '')).join('\n'),
  )
  return new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>], {
    type: 'application/zip',
  })
}

function Shelf() {
  const { books, openBook, usage, refresh } = useAlbum()
  useEffect(() => {
    void refresh()
  }, [refresh])
  return (
    <div className="shelf">
      {books.length === 0 ? (
        <div className="empty-state">
          <h3>{vi.album.emptyTitle}</h3>
          <p>{vi.album.emptyBody}</p>
        </div>
      ) : (
        <ul className="shelf-grid">
          {books.map((b) => (
            <li key={b.id}>
              <button
                className={
                  'shelf-book ' + (COVERS[vibeById(b.vibeId).bookCover] ?? '')
                }
                onClick={() => openBook(b.id)}
              >
                <b>{b.title}</b>
                <small>
                  {b.pageIds.length} {vi.album.pages}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {usage && usage.quota > 0 && (
        <p className="panel-note">
          {vi.album.usage}: {(usage.usage / 1e6).toFixed(1)} MB /{' '}
          {(usage.quota / 1e6).toFixed(0)} MB
          {usage.usage / usage.quota > 0.8 && (
            <b className="warn"> · {vi.album.nearlyFull}</b>
          )}
        </p>
      )}
    </div>
  )
}

function OpenBook({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null)
  const [pages, setPages] = useState<StoredPage[]>([])
  const [current, setCurrent] = useState(0)
  const [reel, setReel] = useState(false)
  const flip = useRef<FlipBookHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState({ w: 360, h: 480 })
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    // Fit two 3:4 pages (one on narrow screens) inside the free area.
    const measure = () => {
      const r = el.getBoundingClientRect()
      const availW = Math.max(200, r.width - 120)
      const availH = Math.max(260, r.height - 16)
      const spread = availW > 700 ? 2 : 1
      const h = Math.floor(Math.min(availH, ((availW / spread) * 4) / 3))
      const w = Math.floor((h * 3) / 4)
      setPage((p) =>
        Math.abs(p.w - w) > 8 || Math.abs(p.h - h) > 8 ? { w, h } : p,
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [book])
  const { openBook, refresh } = useAlbum()

  const load = useCallback(async () => {
    const b = await getBook(bookId)
    if (!b) return openBook(null)
    const ps = (await Promise.all(b.pageIds.map(getPage))).filter(
      (p): p is StoredPage => !!p,
    )
    setBook(b)
    setPages(ps)
  }, [bookId, openBook])
  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') flip.current?.next()
      else if (e.key === 'ArrowLeft') flip.current?.prev()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  if (!book) return <p className="panel-note">{vi.album.loading}</p>
  const vibe = vibeById(book.vibeId)
  const cover = COVERS[vibe.bookCover] ?? 'cover-polka'
  // Covers are pages 0 and last; content pages padded to an even count.
  const content: (StoredPage | null)[] = [...pages]
  if (content.length % 2) content.push(null)
  const visibleIdx = new Set([current, current + 1])

  const onDelete = async (id: string) => {
    await deletePage(id)
    await load()
    await refresh()
  }
  const onCaption = (id: string, caption: string) => {
    void updateCaption(id, caption).catch(() =>
      useUi.getState().showToast({ text: vi.capture.failed, ttl: 3000 }),
    )
  }

  return (
    <div className="open-book">
      <div className="book-toolbar">
        <button className="ghost" onClick={() => openBook(null)}>
          <ArrowLeft size={16} /> {vi.album.shelf}
        </button>
        <b>{book.title}</b>
        <span className="spacer" />
        <button
          className="ghost"
          disabled={!pages.length}
          onClick={() => setReel(true)}
        >
          <Film size={16} /> {vi.reel.button}
        </button>
        <button
          className="ghost"
          disabled={!pages.length}
          onClick={() =>
            void zipBook(book, pages).then((z) =>
              downloadBlob(z, captureFilename('zip')),
            )
          }
        >
          <Download size={16} /> {vi.album.zip}
        </button>
        <button
          className="ghost"
          onClick={() => {
            if (!confirm(vi.album.confirmDelete)) return
            void deleteBook(book.id).then(async () => {
              await refresh()
              openBook(null)
            })
          }}
        >
          <Trash2 size={16} /> {vi.album.deleteBook}
        </button>
      </div>
      {pages.length === 0 ? (
        <div className="empty-state">
          <h3>{vi.album.emptyBook}</h3>
        </div>
      ) : (
        <div className="book-stage" ref={stageRef}>
          <button
            className="round nav"
            aria-label={vi.album.prev}
            onClick={() => flip.current?.prev()}
          >
            <ChevronLeft />
          </button>
          <FlipBook
            // page-flip reads its size once: remount when the fit changes.
            key={page.w + 'x' + page.h}
            ref={flip}
            width={page.w}
            height={page.h}
            className="flip-book"
            onFlip={(p) => {
              setCurrent(p)
              playSound('pageFlip')
            }}
          >
            <BookCover title={book.title} cover={cover} />
            {content.map((p, i) => (
              <BookPage
                key={p?.id ?? 'blank' + i}
                page={p}
                number={i + 1}
                near={Math.abs(i + 1 - current) <= 2}
                visible={visibleIdx.has(i + 1)}
                onCaption={onCaption}
                onDelete={(id) => void onDelete(id)}
              />
            ))}
            <BookCover title={book.title} cover={cover} back />
          </FlipBook>
          <button
            className="round nav"
            aria-label={vi.album.next}
            onClick={() => flip.current?.next()}
          >
            <ChevronRight />
          </button>
        </div>
      )}
      {reel && (
        <HighlightExporter
          pages={pages}
          vibe={vibe}
          onClose={() => setReel(false)}
        />
      )}
    </div>
  )
}

/** Full-screen Photo Book (lazy chunk). Inference is paused while open. */
export default function PhotoBookView({ onClose }: { onClose(): void }) {
  const openBookId = useAlbum((s) => s.openBookId)
  return (
    <div
      className="photobook"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-title"
    >
      <header className="photobook-head">
        <h2 id="book-title">{vi.drawer.book}</h2>
        <button className="round" aria-label={vi.close} onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {openBookId ? (
        <OpenBook key={openBookId} bookId={openBookId} />
      ) : (
        <Shelf />
      )}
    </div>
  )
}
