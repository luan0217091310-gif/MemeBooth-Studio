import { create } from 'zustand'

interface FxState {
  activeProps: string[]
  muted: boolean
  soundReactive: boolean
  micStatus: 'off' | 'starting' | 'on' | 'denied'
  recordMic: boolean
  micSensitivity: number
  reduceFlash: boolean
  reducedMotion: boolean
  /** Coarse HUD info (<= 10 Hz). */
  pending: { name: string; progress: number } | null
  micLevel: number
  lastMeme: string | null
  toggleProp(id: string): void
  set(partial: Partial<Omit<FxState, 'set' | 'toggleProp'>>): void
}

const prefersReduced =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

export const useFx = create<FxState>((set, get) => ({
  activeProps: [],
  muted: false,
  soundReactive: false,
  micStatus: 'off',
  recordMic: false,
  micSensitivity: 1,
  reduceFlash: prefersReduced,
  reducedMotion: prefersReduced,
  pending: null,
  micLevel: 0,
  lastMeme: null,
  toggleProp(id) {
    const cur = get().activeProps
    set({
      activeProps: cur.includes(id)
        ? cur.filter((p) => p !== id)
        : [...cur, id],
    })
  },
  set: (partial) => set(partial),
}))
