const pad = (n: number) => String(n).padStart(2, '0')

/** memebooth_YYYYMMDD_HHmmss.<ext> in local time. */
export function captureFilename(ext: string, date = new Date()): string {
  const d = date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
  const t =
    pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds())
  return 'memebooth_' + d + '_' + t + '.' + ext.replace(/^\./, '')
}

/** Triggers a browser download for a blob (object URL revoked afterwards). */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode-failed'))),
      type,
      quality,
    ),
  )
}
