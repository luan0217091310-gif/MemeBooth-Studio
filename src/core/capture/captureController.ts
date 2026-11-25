import { playSound } from '@/core/audio/soundRegistry'
import { browserMime, Recorder, type RecordResult } from '@/core/audio/recorder'
import type { StageEngine } from '@/core/canvas/stageEngine'
import { vi } from '@/i18n/vi'
import { useCapture, type LiveClip } from '@/store/capture'
import { useUi } from '@/store/ui'
import { useVibe } from '@/store/vibe'
import { canvasToBlob } from './filename'
import { composeLayout, layouts } from './layouts'

const LIVE_LONG_EDGE = 640
const LIVE_BITRATE = 1_500_000
const VIDEO_LONG_EDGE = 1280
const VIDEO_BITRATE = 4_000_000

class Cancelled extends Error {}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Cancelled())
    const id = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new Cancelled())
      },
      { once: true },
    )
  })
}

function copyCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  c.getContext('2d')!.drawImage(src, 0, 0)
  return c
}

async function posterOf(shot: HTMLCanvasElement): Promise<Blob> {
  const k = LIVE_LONG_EDGE / Math.max(shot.width, shot.height)
  const c = document.createElement('canvas')
  c.width = Math.round(shot.width * k)
  c.height = Math.round(shot.height * k)
  c.getContext('2d')!.drawImage(shot, 0, 0, c.width, c.height)
  return canvasToBlob(c, 'image/jpeg', 0.85)
}

/**
 * Photobooth (countdown, flash, live clip per shot, layout compose) and video
 * recording. Every output comes from the engine's compositor (L0-L2, no HUD)
 * and the single audio bus.
 */
export class CaptureController {
  private abort: AbortController | null = null
  private videoRec: Recorder | null = null
  private videoTimer = 0

  constructor(private engine: StageEngine) {
    document.addEventListener('visibilitychange', this.onHidden)
  }

  get busy(): boolean {
    return useCapture.getState().phase !== 'idle'
  }

  // ---------------- photobooth ----------------

  async startPhoto(): Promise<void> {
    if (this.busy) return
    const cap = useCapture.getState()
    const layout = layouts[cap.layout]
    const abort = new AbortController()
    this.abort = abort
    const shots: HTMLCanvasElement[] = []
    const clips: LiveClip[] = []
    const mime = browserMime()
    cap.set({ phase: 'photo', shot: 0, total: layout.shots, count: null })
    try {
      for (let i = 0; i < layout.shots; i++) {
        useCapture.getState().set({ shot: i + 1 })
        let live: Recorder | null = null
        let liveFrom = 0
        const countdownSec = useCapture.getState().countdownSec
        const steps =
          countdownSec === 3 ? [3, 2, 1] : countdownSec === 1 ? [1] : []
        for (const n of steps) {
          useCapture.getState().set({ count: n })
          playSound('beep', { pitch: n === 1 ? 1.5 : 1 })
          // Live Photo: start ~2 s before the shutter (when 3s countdown is active).
          if (n === 2 && mime) {
            const stream = this.engine.startStream(LIVE_LONG_EDGE)
            if (stream) {
              live = new Recorder(mime)
              live.start(stream, LIVE_BITRATE)
              liveFrom = performance.now()
            }
          }
          await sleep(1000, abort.signal)
        }
        useCapture.getState().set({ count: null })
        const still = copyCanvas(this.engine.captureStill())
        this.engine.fx.flash(performance.now())
        playSound('shutter')
        if (typeof navigator !== 'undefined') navigator.vibrate?.([14, 24, 14])
        shots.push(still)
        if (live) {
          await sleep(500, abort.signal)
          const res = await live.stop()
          this.engine.stopStream()
          clips.push(await this.toClip(res, still, liveFrom))
        }
        if (i < layout.shots - 1) await sleep(1500, abort.signal)
      }
      useCapture.getState().set({ phase: 'composing', count: null })
      const composed = composeLayout(
        layout,
        shots,
        useVibe.getState().preset.photoFrame,
        new Date(),
        useCapture.getState().frameLabel,
      )
      const png = await canvasToBlob(composed, 'image/png')
      useCapture.getState().set({
        phase: 'review',
        photo: {
          layout: layout.id,
          png,
          url: URL.createObjectURL(png),
          shots,
          clips,
          createdAt: Date.now(),
        },
      })
    } catch (e) {
      this.engine.stopStream()
      useCapture.getState().set({ phase: 'idle', count: null })
      if (!(e instanceof Cancelled))
        useUi.getState().showToast({ text: vi.capture.failed, ttl: 4000 })
    } finally {
      this.abort = null
    }
  }

  private async toClip(
    res: RecordResult,
    still: HTMLCanvasElement,
    from: number,
  ): Promise<LiveClip> {
    const log = this.engine.memeLog.filter((m) => m.t >= from)
    return {
      blob: res.blob,
      poster: await posterOf(still),
      mime: res.mime,
      ext: res.ext,
      memeIds: log.map((m) => m.memeId),
      soundIds: log.map((m) => m.soundId),
    }
  }

  cancel(): void {
    this.abort?.abort()
    if (useCapture.getState().phase === 'recording') void this.stopVideo()
  }

  closeReview(): void {
    const { photo, video } = useCapture.getState()
    if (photo) URL.revokeObjectURL(photo.url)
    if (video) URL.revokeObjectURL(video.url)
    useCapture.getState().set({ phase: 'idle', photo: null, video: null })
  }

  // ---------------- video ----------------

  startVideo(): void {
    if (this.busy) return
    const mime = browserMime()
    if (!mime) {
      useUi.getState().showToast({ text: vi.capture.noRecorder, ttl: 6000 })
      return
    }
    const stream = this.engine.startStream(VIDEO_LONG_EDGE)
    if (!stream) {
      useUi.getState().showToast({ text: vi.capture.noRecorder, ttl: 6000 })
      return
    }
    this.videoRec = new Recorder(mime)
    this.videoRec.start(stream, VIDEO_BITRATE)
    const max = useCapture.getState().maxVideoMs
    useCapture
      .getState()
      .set({ phase: 'recording', recStartedAt: performance.now() })
    this.videoTimer = window.setTimeout(() => void this.stopVideo(), max)
  }

  async stopVideo(): Promise<void> {
    const rec = this.videoRec
    if (!rec) return
    this.videoRec = null
    window.clearTimeout(this.videoTimer)
    const from = useCapture.getState().recStartedAt
    const poster = await canvasToBlob(
      copyCanvas(this.engine.captureStill()),
      'image/jpeg',
      0.85,
    ).catch(() => null)
    try {
      const res = await rec.stop()
      const log = this.engine.memeLog.filter((m) => m.t >= from)
      useCapture.getState().set({
        phase: 'videoReview',
        video: {
          blob: res.blob,
          url: URL.createObjectURL(res.blob),
          ext: res.ext,
          mime: res.mime,
          durationMs: res.durationMs,
          createdAt: Date.now(),
          poster,
          soundIds: log.map((m) => m.soundId),
          memeIds: log.map((m) => m.memeId),
        },
      })
    } catch {
      useCapture.getState().set({ phase: 'idle' })
      useUi.getState().showToast({ text: vi.capture.failed, ttl: 4000 })
    } finally {
      this.engine.stopStream()
    }
  }

  /** requestAnimationFrame stops in hidden tabs, so recordings stop too. */
  private onHidden = () => {
    if (!document.hidden) return
    const phase = useCapture.getState().phase
    if (phase === 'recording') {
      void this.stopVideo()
      useUi.getState().showToast({ text: vi.capture.hiddenStop, ttl: 6000 })
    } else if (phase === 'photo') {
      this.cancel()
      useUi.getState().showToast({ text: vi.capture.hiddenStop, ttl: 6000 })
    }
  }

  dispose(): void {
    this.cancel()
    document.removeEventListener('visibilitychange', this.onHidden)
  }
}
