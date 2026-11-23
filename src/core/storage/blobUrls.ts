// Object URLs for blobs that must stay addressable by key (custom meme
// images). Revoked when replaced or removed.
const urls = new Map<string, string>()

export function setBlobUrl(key: string, blob: Blob): string {
  const old = urls.get(key)
  if (old) URL.revokeObjectURL(old)
  const url = URL.createObjectURL(blob)
  urls.set(key, url)
  return url
}

export function blobUrl(key: string): string | undefined {
  return urls.get(key)
}

export function dropBlobUrl(key: string): void {
  const old = urls.get(key)
  if (old) URL.revokeObjectURL(old)
  urls.delete(key)
}
