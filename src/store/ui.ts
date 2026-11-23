import { create } from 'zustand'

export interface Toast {
  id: number
  text: string
  actionLabel?: string
  action?: () => void
  ttl: number
}

export type DrawerPanel =
  | 'brush'
  | 'sticker'
  | 'memes'
  | 'creator'
  | 'props'
  | 'vibe'
  | 'book'
  | 'settings'

export type Hint = 'lowLight' | 'showHand' | null

interface UiState {
  toast: Toast | null
  drawer: DrawerPanel | null
  /** Onboarding coach mark step (0..2), or -1 when done/skipped. */
  coach: number
  hint: Hint
  bookOpen: boolean
  setBookOpen(open: boolean): void
  showToast(t: Omit<Toast, 'id'>): void
  dismissToast(): void
  setDrawer(d: DrawerPanel | null): void
  setCoach(step: number): void
  setHint(h: Hint): void
}

const COACH_KEY = 'memebooth.onboarded'
function coachStart(): number {
  try {
    return localStorage.getItem(COACH_KEY) ? -1 : 0
  } catch {
    return 0
  }
}

let seq = 0
export const useUi = create<UiState>((set) => ({
  toast: null,
  drawer: null,
  coach: coachStart(),
  hint: null,
  bookOpen: false,
  setBookOpen: (bookOpen) => set({ bookOpen, drawer: null }),
  showToast: (t) => set({ toast: { ...t, id: ++seq } }),
  dismissToast: () => set({ toast: null }),
  setDrawer: (drawer) => set({ drawer }),
  setCoach(coach) {
    if (coach < 0)
      try {
        localStorage.setItem(COACH_KEY, '1')
      } catch {
        /* ignore: onboarding simply shows again next time */
      }
    set({ coach })
  },
  setHint: (hint) => set({ hint }),
}))
