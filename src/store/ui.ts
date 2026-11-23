import { create } from 'zustand'

export interface Toast {
  id: number
  text: string
  actionLabel?: string
  action?: () => void
  ttl: number
}

interface UiState {
  toast: Toast | null
  showToast(t: Omit<Toast, 'id'>): void
  dismissToast(): void
}

let seq = 0
export const useUi = create<UiState>((set) => ({
  toast: null,
  showToast: (t) => set({ toast: { ...t, id: ++seq } }),
  dismissToast: () => set({ toast: null }),
}))
