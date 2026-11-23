import { getBus } from '@/core/audio/engine'
import { browserMime, Recorder, type RecordResult } from '@/core/audio/recorder'
import { playSound } from '@/core/audio/soundRegistry'
import type { VibePreset } from '@/types'
import { drawCover } from './layouts'

export interface ReelMoment {
  photo: Blob
  clip?: Blob
  soundIds: string[]
}

export type ReelFormat = '9:16' | '16:9'
export type Transition = 'zoom' | 'slide' | 'flash' | 'glitch'

export const TITLE_S = 1.5
export const CLIP_S = 2.5
export const OUTRO_S = 2
const TRANSITION_S = 0.4

export const vibeTransition: Record<string, Transition> = {
  kawaii: 'zoom',
  y2k: 'glitch',
  chaotic: 'flash',
  neon: 'slide',
}

/** Total reel length in seconds (pure; used for progress and tests). */
export function reelDuration(moments: number): number {
  return TITLE_S + moments * CLIP_S + OUTRO_S
}

/** Which segment a time falls into. */
export function segmentAt(
  t: number,
  moments: number,
):
  | { kind: 'title'; local: number }
  | { kind: 'clip'; index: number; local: number }
  | { kind: 'outro'; local: number } {
  if (t < TITLE_S) return { kind: 'title', local: t }
  const c = t - TITLE_S
  const i = Math.floor(c / CLIP_S)
  if (i < moments) return { kind: 'clip', index: i, local: c - i * CLIP_S }
  return { kind: 'outro', local: c - moments * CLIP_S }
}

export class ReelCancelled extends Error {}

interface Prepared {
  photo: ImageBitmap
  video: HTMLVideoElement | null
  url: string | null
  soundIds: string[]
}

async function prepare(m: ReelMoment): Promise<Prepared> {
  const photo = await createImageBitmap(m.photo)
  if (!m.clip) return { photo, video: null, url: null, soundIds: m.soundIds }
  const url = URL.createObjectURL(m.clip)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.loop = true
  video.src = url
  try {
    await new Promise<void>((resolve, reject) => {
      video.oncanplay = () => resolve()
      video.onerror = () => reject(new Error('clip'))
      setTimeout(() => reject(new Error('clip-timeout')), 4000)
    })
    return { photo, video, url, soundIds: m.soundIds }
  } catch {
    URL.revokeObjectURL(url)
    return { photo, video: null, url: null, soundIds: m.soundIds }
  }
}

/**
 * Plays the timeline on a hidden canvas in real time and records it with
 * MediaRecorder. Takes as long as the reel itself; cancellable.
 */
export async function renderReel(
  moments: ReelMoment[],
  vibe: VibePreset,
  format: ReelFormat,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<RecordResult> {
  const mime = browserMime()
  const bus = getBus()
  if (!mime || !bus) throw new Error('no-recorder')
  const [W, H] = format === '9:16' ? [720, 1280] : [1280, 720]
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const items = await Promise.all(moments.map(prepare))
  const total = reelDuration(items.length)
  const transition = vibeTransition[vibe.id] ?? 'zoom'
  const accent = vibe.ui['--mb-accent'] ?? '#ffb5d8'
  const bg = vibe.ui['--mb-bg'] ?? '#fff4e6'
  const ink = vibe.ui['--mb-text'] ?? '#33233d'

  // Audio: dedicated destination fed by BGM + meme sounds (also audible).
  const dest = bus.ctx.createMediaStreamDestination()
  const bgm = bus.ctx.createGain()
  const memes = bus.ctx.createGain()
  bgm.gain.value = 0.8
  bgm.connect(dest)
  bgm.connect(bus.master)
  memes.connect(dest)
  memes.connect(bus.master)

  const stream = (
    canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }
  ).captureStream(30)
  const track = dest.stream.getAudioTracks()[0]
  if (track) stream.addTrack(track)
  const rec = new Recorder(mime)
  rec.start(stream, 5_000_000)

  const bgmLen = (60 / (vibe.id === 'chaotic' ? 136 : 112) / 2) * 16
  let nextBgm = 0
  let lastClip = -1
  const start = performance.now()

  const drawTitle = (local: number) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const k = Math.min(1, local / 0.5)
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, Math.max(W, H) * 0.3 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '900 ' + Math.round(W * 0.1) + 'px "Be Vietnam Pro", sans-serif'
    ctx.fillText('MemeBooth', W / 2, H / 2 - W * 0.05)
    ctx.font =
      '700 ' + Math.round(W * 0.045) + 'px "Be Vietnam Pro", sans-serif'
    ctx.fillText(
      'Highlight · ' + new Date().toLocaleDateString('vi-VN'),
      W / 2,
      H / 2 + W * 0.07,
    )
  }

  const drawMoment = (it: Prepared, local: number) => {
    // Ken Burns for stills (and a gentle push-in on clips).
    const z = 1 + 0.12 * (local / CLIP_S)
    const w = W * z
    const h = H * z
    const r = { x: (W - w) / 2 - (z - 1) * W * 0.2, y: (H - h) / 2, w, h }
    if (it.video && it.video.readyState >= 2)
      drawCover(ctx, it.video, r, {
        width: it.video.videoWidth,
        height: it.video.videoHeight,
      })
    else drawCover(ctx, it.photo, r)
  }

  const applyTransition = (local: number) => {
    if (local > TRANSITION_S) return
    const p = local / TRANSITION_S
    if (transition === 'flash') {
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')'
      ctx.fillRect(0, 0, W, H)
    } else if (transition === 'glitch') {
      for (let i = 0; i < 6; i++) {
        const y = Math.random() * H
        const hh = 10 + Math.random() * 40
        ctx.drawImage(
          canvas,
          0,
          y,
          W,
          hh,
          (Math.random() - 0.5) * 60 * (1 - p),
          y,
          W,
          hh,
        )
      }
    } else if (transition === 'slide') {
      ctx.fillStyle = accent
      ctx.fillRect(W * p, 0, W * (1 - p), H)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,' + 0.8 * (1 - p) + ')'
      ctx.fillRect(0, 0, W, H)
    }
  }

  const drawOutro = (local: number) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const n = Math.max(1, items.length)
    const cols = n > 1 ? 2 : 1
    const rows = Math.ceil(n / cols)
    const pad = W * 0.04
    const cw = (W - pad * (cols + 1)) / cols
    const ch = (H * 0.78 - pad * (rows + 1)) / rows
    items.forEach((it, i) => {
      const appear = Math.min(1, Math.max(0, (local - i * 0.15) / 0.3))
      ctx.globalAlpha = appear
      const x = pad + (i % cols) * (cw + pad)
      const y = pad + Math.floor(i / cols) * (ch + pad)
      drawCover(ctx, it.photo, { x, y, w: cw, h: ch })
      ctx.globalAlpha = 1
    })
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.font = '900 ' + Math.round(W * 0.08) + 'px "Be Vietnam Pro", sans-serif'
    ctx.fillText('MemeBooth', W / 2, H * 0.9)
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => reject(new ReelCancelled())
      signal.addEventListener('abort', onAbort, { once: true })
      const frame = () => {
        if (signal.aborted) return
        const t = (performance.now() - start) / 1000
        if (t >= total) return resolve()
        if (t >= nextBgm) {
          playSound(vibe.sounds.bgm, { gain: 1 }, bgm)
          nextBgm += bgmLen
        }
        const seg = segmentAt(t, items.length)
        if (seg.kind === 'title') drawTitle(seg.local)
        else if (seg.kind === 'clip') {
          const it = items[seg.index]!
          if (seg.index !== lastClip) {
            lastClip = seg.index
            void it.video?.play().catch(() => undefined)
            items[seg.index - 1]?.video?.pause()
            const sid = it.soundIds[0]
            if (sid) {
              // Duck the background music while the meme sound plays.
              const now = bus.ctx.currentTime
              bgm.gain.setTargetAtTime(0.25, now, 0.05)
              bgm.gain.setTargetAtTime(0.8, now + 1.2, 0.2)
              playSound(sid, undefined, memes)
            }
          }
          drawMoment(it, seg.local)
          applyTransition(seg.local)
        } else drawOutro(seg.local)
        onProgress(t / total)
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    onProgress(1)
    return await rec.stop()
  } catch (e) {
    await rec.stop().catch(() => undefined)
    throw e
  } finally {
    stream.getVideoTracks().forEach((t) => t.stop())
    bgm.disconnect()
    memes.disconnect()
    for (const it of items) {
      it.video?.pause()
      if (it.url) URL.revokeObjectURL(it.url)
      it.photo.close()
    }
  }
}
