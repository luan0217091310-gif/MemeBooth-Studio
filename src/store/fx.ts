import { create } from 'zustand'

export type RingLightMode = 'off' | 'white' | 'pink' | 'warm'

interface FxState {
  activeProps: string[]
  muted: boolean
  soundReactive: boolean
  micStatus: 'off' | 'starting' | 'on' | 'denied'
  recordMic: boolean
  micSensitivity: number
  reduceFlash: boolean
  reducedMotion: boolean
  /** Lightweight mode for low-spec laptops/phones: 1x DPR, lower AI res, no bloom/blur. */
  liteMode: boolean
  /** Optional live hand/face skeleton overlay so users see AI tracking clearly. */
  showSkeleton: boolean
  /** GPU soft-skin beauty glow intensity (0..1). */
  beauty: number
  /** Screen fill-light frame around the stage for dark rooms. */
  ringLight: RingLightMode
  /** Hold Victory (✌️) for 0.85s to automatically snap a photobooth session. */
  handShutter: boolean
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

function detectLowSpec(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  // Auto-enable lite mode on devices with <= 4 CPU threads or <= 4 GB RAM.
  if (typeof mem === 'number' && mem > 0 && mem <= 4) return true
  if (typeof cores === 'number' && cores > 0 && cores <= 4) return true
  return false
}

export const useFx = create<FxState>((set, get) => ({
  activeProps: [],
  muted: false,
  soundReactive: false,
  micStatus: 'off',
  recordMic: false,
  micSensitivity: 1,
  reduceFlash: prefersReduced,
  reducedMotion: prefersReduced,
  liteMode: detectLowSpec(),
  showSkeleton: false,
  beauty: 0.25,
  ringLight: 'off',
  handShutter: false,
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
