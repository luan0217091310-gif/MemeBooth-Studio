import type { ShareProvider } from '@/types'
import { downloadBlob } from '@/core/capture/filename'

/** True when the device can share this file through the OS share sheet. */
export function canShareFile(file: File): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    )
  } catch {
    return false
  }
}

/**
 * Default provider. Nothing leaves the device: Web Share API when the device
 * supports sharing files, otherwise a download. No QR to the image (a QR
 * holds a few KB and there is no server to host the photo).
 */
export class LocalShareProvider implements ShareProvider {
  readonly id = 'local' as const
  isAvailable(): boolean {
    return true
  }
  async share(file: Blob, name: string): Promise<{ qrUrl?: string }> {
    const f = new File([file], name, { type: file.type })
    if (canShareFile(f)) {
      try {
        await navigator.share({ files: [f], title: 'MemeBooth' })
        return {}
      } catch (e) {
        // User cancelled the share sheet: do nothing.
        if (e instanceof DOMException && e.name === 'AbortError') return {}
      }
    }
    downloadBlob(file, name)
    return {}
  }
}

/**
 * Opt-in provider: uploads to an endpoint the user configured themselves
 * (off by default). Expects a JSON response `{ "url": "https://..." }` and
 * returns it so the UI can show a QR that points to the uploaded image.
 */
export class UploadShareProvider implements ShareProvider {
  readonly id = 'upload' as const
  constructor(private endpoint: string) {}

  isAvailable(): boolean {
    return isValidEndpoint(this.endpoint)
  }

  async share(file: Blob, name: string): Promise<{ qrUrl?: string }> {
    if (!this.isAvailable()) throw new Error('upload-not-configured')
    const body = new FormData()
    body.append('file', file, name)
    const res = await fetch(this.endpoint, { method: 'POST', body })
    if (!res.ok) throw new Error('upload-failed:' + res.status)
    const json = (await res.json()) as { url?: unknown }
    if (typeof json.url !== 'string' || !/^https?:\/\//.test(json.url))
      throw new Error('upload-bad-response')
    return { qrUrl: json.url }
  }
}

/** Only HTTPS endpoints (or localhost for testing) are accepted. */
export function isValidEndpoint(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' ||
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1'
    )
  } catch {
    return false
  }
}

/** URL that opens the app on another device (QR). */
export function appUrl(): string {
  return location.origin + location.pathname
}
