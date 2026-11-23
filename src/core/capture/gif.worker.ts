/// <reference lib="webworker" />
import { GIFEncoder, applyPalette, quantize } from 'gifenc'

export interface GifRequest {
  width: number
  height: number
  delay: number
  /** RGBA frames (transferred). */
  frames: ArrayBuffer[]
}
export type GifResponse =
  { ok: true; bytes: ArrayBuffer } | { ok: false; error: string }

const scope = self as unknown as DedicatedWorkerGlobalScope

scope.onmessage = (e: MessageEvent<GifRequest>) => {
  try {
    const { width, height, delay, frames } = e.data
    const gif = GIFEncoder()
    for (const buf of frames) {
      const rgba = new Uint8Array(buf)
      const palette = quantize(rgba, 256)
      const index = applyPalette(rgba, palette)
      gif.writeFrame(index, width, height, { palette, delay })
    }
    gif.finish()
    const bytes = gif.bytes()
    const out = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    scope.postMessage({ ok: true, bytes: out } satisfies GifResponse, [out])
  } catch (err) {
    scope.postMessage({ ok: false, error: String(err) } satisfies GifResponse)
  }
}
