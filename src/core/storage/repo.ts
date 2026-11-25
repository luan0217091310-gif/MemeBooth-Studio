import {
  createStore,
  del,
  entries,
  get,
  keys,
  set,
  type UseStore,
} from 'idb-keyval'
import type { BookPage, LayoutId, MemeDef, SoundId } from '@/types'
import { migrate, type KvAdapter, type StoreName } from './migrations'

// All IndexedDB access goes through this module. Components never touch it.
// idb-keyval holds one object store per database, so each logical store
// gets its own database name.

export interface Book {
  id: string
  title: string
  vibeId: string
  createdAt: number
  pageIds: string[]
}

/** BookPage + optional fields used by video pages and memes metadata. */
export interface StoredPage extends BookPage {
  kind: 'photo' | 'video'
  memeIds: string[]
}

export interface StoredMeme {
  def: MemeDef
  image?: Blob
  sound?: Blob
}

export interface AppSettings {
  vibeId?: string
  mirror?: boolean
  muted?: boolean
  micSensitivity?: number
  onboarded?: boolean
  reduceFlash?: boolean
  reducedMotion?: boolean
  liteMode?: boolean
  showSkeleton?: boolean
  beauty?: number
  ringLight?: 'off' | 'white' | 'pink' | 'warm'
  handShutter?: boolean
}

export class StorageError extends Error {
  constructor(
    public code: 'quota' | 'unavailable' | 'unknown',
    message: string,
  ) {
    super(message)
  }
}

const stores = new Map<StoreName, UseStore>()
function store(name: StoreName): UseStore {
  let s = stores.get(name)
  if (!s) {
    s = createStore('memebooth-' + name, name)
    stores.set(name, s)
  }
  return s
}

function wrap(e: unknown): StorageError {
  const name = e instanceof DOMException || e instanceof Error ? e.name : ''
  if (name === 'QuotaExceededError') return new StorageError('quota', String(e))
  if (name === 'InvalidStateError' || name === 'UnknownError')
    return new StorageError('unavailable', String(e))
  return new StorageError('unknown', String(e))
}

async function put(
  name: StoreName,
  key: string,
  value: unknown,
): Promise<void> {
  try {
    await set(key, value, store(name))
  } catch (e) {
    throw wrap(e)
  }
}

const adapter: KvAdapter = {
  keys: async (s) => (await keys(store(s))).map(String),
  get: (s, k) => get(k, store(s)),
  set: (s, k, v) => put(s, k, v),
}

let ready: Promise<void> | null = null
export function initStorage(): Promise<void> {
  ready ??= migrate(adapter).then(() => undefined)
  return ready
}

let persistAsked = false
async function askPersist(): Promise<void> {
  if (persistAsked) return
  persistAsked = true
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* best effort */
  }
}

export async function storageEstimate(): Promise<{
  usage: number
  quota: number
} | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null
  } catch {
    return null
  }
}

const uid = (p: string) =>
  p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ---------------- books & pages ----------------

export async function listBooks(): Promise<Book[]> {
  await initStorage()
  const all = (await entries<string, Book>(store('books'))).map(([, b]) => b)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getBook(id: string): Promise<Book | undefined> {
  await initStorage()
  return get<Book>(id, store('books'))
}

export async function createBook(title: string, vibeId: string): Promise<Book> {
  await initStorage()
  const book: Book = {
    id: uid('b'),
    title,
    vibeId,
    createdAt: Date.now(),
    pageIds: [],
  }
  await put('books', book.id, book)
  return book
}

export async function renameBook(id: string, title: string): Promise<void> {
  const b = await getBook(id)
  if (b) await put('books', id, { ...b, title })
}

export interface NewPage {
  kind: 'photo' | 'video'
  photo: Blob
  liveClip?: Blob
  poster?: Blob
  soundIds: SoundId[]
  memeIds: string[]
  caption: string
  layout: LayoutId
}

export async function addPage(
  bookId: string,
  page: NewPage,
): Promise<StoredPage> {
  await initStorage()
  const book = await getBook(bookId)
  if (!book) throw new StorageError('unknown', 'book-missing')
  const stored: StoredPage = {
    ...page,
    id: uid('p'),
    bookId,
    createdAt: Date.now(),
  }
  await put('pages', stored.id, stored)
  await put('books', book.id, {
    ...book,
    pageIds: [...book.pageIds, stored.id],
  })
  void askPersist()
  return stored
}

export async function getPage(id: string): Promise<StoredPage | undefined> {
  await initStorage()
  return get<StoredPage>(id, store('pages'))
}

export async function updateCaption(
  id: string,
  caption: string,
): Promise<void> {
  const p = await getPage(id)
  if (p) await put('pages', id, { ...p, caption })
}

export async function deletePage(id: string): Promise<void> {
  const p = await getPage(id)
  if (!p) return
  const book = await getBook(p.bookId)
  if (book)
    await put('books', book.id, {
      ...book,
      pageIds: book.pageIds.filter((x) => x !== id),
    })
  await del(id, store('pages'))
}

export async function deleteBook(id: string): Promise<void> {
  const b = await getBook(id)
  if (!b) return
  for (const pid of b.pageIds) await del(pid, store('pages'))
  await del(id, store('books'))
}

// ---------------- custom memes ----------------

export async function listCustomMemes(): Promise<StoredMeme[]> {
  await initStorage()
  return (await entries<string, StoredMeme>(store('memes'))).map(([, m]) => m)
}

export async function saveCustomMeme(meme: StoredMeme): Promise<void> {
  await initStorage()
  await put('memes', meme.def.id, meme)
  void askPersist()
}

export async function deleteCustomMeme(id: string): Promise<void> {
  await del(id, store('memes'))
}

// ---------------- settings ----------------

export async function loadSettings(): Promise<AppSettings> {
  try {
    await initStorage()
    return (await get<AppSettings>('app', store('settings'))) ?? {}
  } catch {
    return {}
  }
}

export async function saveSettings(patch: AppSettings): Promise<void> {
  const cur = await loadSettings()
  await put('settings', 'app', { ...cur, ...patch })
}
