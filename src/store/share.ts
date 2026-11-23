import { create } from 'zustand'

const KEY = 'memebooth.upload'

interface ShareState {
  uploadEnabled: boolean
  endpoint: string
  /** File currently offered in the share modal. */
  file: { blob: Blob; name: string } | null
  open(blob: Blob, name: string): void
  close(): void
  configure(enabled: boolean, endpoint: string): void
}

function load(): { uploadEnabled: boolean; endpoint: string } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as {
      uploadEnabled?: boolean
      endpoint?: string
    }
    return { uploadEnabled: !!v.uploadEnabled, endpoint: v.endpoint ?? '' }
  } catch {
    return { uploadEnabled: false, endpoint: '' }
  }
}

export const useShare = create<ShareState>((set) => ({
  ...load(),
  file: null,
  open: (blob, name) => set({ file: { blob, name } }),
  close: () => set({ file: null }),
  configure(uploadEnabled, endpoint) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ uploadEnabled, endpoint }))
    } catch {
      /* non-essential */
    }
    set({ uploadEnabled, endpoint })
  },
}))
