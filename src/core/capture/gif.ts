import { drawCover } from './layouts'
import type { GifRequest, GifResponse } from './gif.worker'

/**
 * Encodes shots into an animated GIF inside a worker (lazy chunk; gifenc is
 * only downloaded when the user asks for a GIF).
 */
export async function encodeGif(
  shots: readonly HTMLCanvasElement[],
  width = 480,
  delay = 600,
): Promise<Blob> {
  const first = shots[0]
  if (!first) throw new Error('no-frames')
  const height = Math.round((width * first.height) / first.width)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const frames: ArrayBuffer[] = shots.map((s) => {
    drawCover(ctx, s, { x: 0, y: 0, w: width, h: height })
    return ctx.getImageData(0, 0, width, height).data.buffer.slice(0)
  })
  const worker = new Worker(new URL('./gif.worker.ts', import.meta.url), {
    type: 'module',
  })
  try {
    const result = await new Promise<GifResponse>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<GifResponse>) => resolve(e.data)
      worker.onerror = (e) => reject(new Error(e.message))
      const req: GifRequest = { width, height, delay, frames }
      worker.postMessage(req, frames)
    })
    if (!result.ok) throw new Error(result.error)
    return new Blob([result.bytes], { type: 'image/gif' })
  } finally {
    worker.terminate()
  }
}
