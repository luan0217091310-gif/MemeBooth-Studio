import { create } from 'zustand'
import type { LayoutId, SoundId } from '@/types'

export interface LiveClip {
  blob: Blob
  poster: Blob
  mime: string
  ext: 'webm' | 'mp4'
  /** Memes and sounds fired during the clip (for Photo Book playback). */
  memeIds: string[]
  soundIds: SoundId[]
}

export interface PhotoResult {
  layout: LayoutId
  png: Blob
  /** Object URL of the composed image (revoked when the review closes). */
  url: string
  shots: HTMLCanvasElement[]
  clips: LiveClip[]
  createdAt: number
}

export interface VideoResult {
  blob: Blob
  url: string
  ext: 'webm' | 'mp4'
  mime: string
  durationMs: number
  poster: Blob | null
  soundIds: string[]
  memeIds: string[]
  createdAt: number
}

export type CapturePhase =
  'idle' | 'photo' | 'composing' | 'review' | 'recording' | 'videoReview'

interface CaptureState {
  phase: CapturePhase
  layout: LayoutId
  /** Countdown seconds before each photo (3, 1, or 0 for instant). */
  countdownSec: 3 | 1 | 0
  /** Optional custom title printed on the photobooth strip / Polaroid frame. */
  frameLabel: string
  /** Big countdown digit on the HUD (3, 2, 1) or null. */
  count: number | null
  shot: number
  total: number
  recStartedAt: number
  maxVideoMs: number
  photo: PhotoResult | null
  video: VideoResult | null
  set(partial: Partial<Omit<CaptureState, 'set'>>): void
}

export const useCapture = create<CaptureState>((set) => ({
  phase: 'idle',
  layout: 'strip',
  countdownSec: 3,
  frameLabel: '',
  count: null,
  shot: 0,
  total: 0,
  recStartedAt: 0,
  maxVideoMs: 60_000,
  photo: null,
  video: null,
  set: (partial) => set(partial),
}))
