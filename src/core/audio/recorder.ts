/** Preference order from the spec; the file extension follows the real mime. */
export const VIDEO_MIME_PREFERENCE = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
] as const

export interface MimeChoice {
  mime: string
  ext: 'webm' | 'mp4'
}

/** Pure: picks the first supported mime. `null` when recording is impossible. */
export function pickMime(
  isSupported: (mime: string) => boolean,
  preference: readonly string[] = VIDEO_MIME_PREFERENCE,
): MimeChoice | null {
  for (const mime of preference) {
    try {
      if (isSupported(mime))
        return { mime, ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' }
    } catch {
      /* some browsers throw for unknown codecs; try the next one */
    }
  }
  return null
}

export function browserMime(): MimeChoice | null {
  if (typeof MediaRecorder === 'undefined') return null
  return pickMime((m) => MediaRecorder.isTypeSupported(m))
}

export interface RecordResult {
  blob: Blob
  mime: string
  ext: 'webm' | 'mp4'
  durationMs: number
}

/** Thin MediaRecorder wrapper that resolves a single Blob on stop. */
export class Recorder {
  private rec: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  private done: Promise<RecordResult> | null = null
  readonly choice: MimeChoice

  constructor(choice: MimeChoice) {
    this.choice = choice
  }

  get active(): boolean {
    return this.rec?.state === 'recording'
  }

  start(stream: MediaStream, videoBitsPerSecond: number): void {
    this.chunks = []
    this.rec = new MediaRecorder(stream, {
      mimeType: this.choice.mime,
      videoBitsPerSecond,
      audioBitsPerSecond: 128_000,
    })
    const rec = this.rec
    this.done = new Promise((resolve, reject) => {
      rec.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data)
      }
      rec.onstop = () =>
        resolve({
          blob: new Blob(this.chunks, { type: this.choice.mime.split(';')[0] }),
          mime: this.choice.mime,
          ext: this.choice.ext,
          durationMs: performance.now() - this.startedAt,
        })
      rec.onerror = () => reject(new Error('recorder-error'))
    })
    this.startedAt = performance.now()
    rec.start(250)
  }

  stop(): Promise<RecordResult> {
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop()
    return this.done ?? Promise.reject(new Error('not-started'))
  }
}
