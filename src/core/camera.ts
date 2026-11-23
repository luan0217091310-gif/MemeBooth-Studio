export type CameraError =
  'denied' | 'notfound' | 'busy' | 'insecure' | 'unsupported' | 'unknown'

export function classifyCameraError(e: unknown): CameraError {
  const name = e instanceof DOMException || e instanceof Error ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'notfound'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unknown'
}

export async function openCamera(
  video: HTMLVideoElement,
  onEnded: () => void,
): Promise<MediaStream> {
  if (!window.isSecureContext)
    throw Object.assign(new Error(), { name: 'Insecure' })
  if (!navigator.mediaDevices?.getUserMedia)
    throw Object.assign(new Error(), { name: 'Unsupported' })
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  })
  for (const track of stream.getVideoTracks()) track.onended = onEnded
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  return stream
}

export function cameraErrorOf(e: unknown): CameraError {
  const name = e instanceof Error ? e.name : ''
  if (name === 'Insecure') return 'insecure'
  if (name === 'Unsupported') return 'unsupported'
  return classifyCameraError(e)
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => {
    t.onended = null
    t.stop()
  })
}
