import { create } from 'zustand'
import {
  addPage,
  createBook,
  listBooks,
  StorageError,
  storageEstimate,
  type Book,
  type NewPage,
} from '@/core/storage/repo'

interface AlbumState {
  books: Book[]
  /** Book that new captures are added to. */
  currentBookId: string | null
  /** Book open in the Photo Book viewer. */
  openBookId: string | null
  usage: { usage: number; quota: number } | null
  loaded: boolean
  refresh(): Promise<void>
  /** Saves a capture into the current book (creating one if needed). */
  save(page: NewPage, vibeId: string, newBook?: boolean): Promise<string>
  setCurrent(id: string | null): void
  openBook(id: string | null): void
}

const bookTitle = () =>
  'Sổ ' +
  new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export const useAlbum = create<AlbumState>((set, get) => ({
  books: [],
  currentBookId: null,
  openBookId: null,
  usage: null,
  loaded: false,
  async refresh() {
    const [books, usage] = await Promise.all([listBooks(), storageEstimate()])
    const cur = get().currentBookId
    set({
      books,
      usage,
      loaded: true,
      currentBookId:
        cur && books.some((b) => b.id === cur) ? cur : (books[0]?.id ?? null),
    })
  },
  async save(page, vibeId, newBook = false) {
    let id = newBook ? null : get().currentBookId
    if (!id) {
      const book = await createBook(bookTitle(), vibeId)
      id = book.id
    }
    await addPage(id, page)
    set({ currentBookId: id })
    await get().refresh()
    return id
  },
  setCurrent: (currentBookId) => set({ currentBookId }),
  openBook: (openBookId) => set({ openBookId }),
}))

export function isQuotaError(e: unknown): boolean {
  return e instanceof StorageError && e.code === 'quota'
}
