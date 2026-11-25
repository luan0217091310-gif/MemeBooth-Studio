export type CameraError =
  'denied' | 'notfound' | 'busy' | 'insecure' | 'unsupported' | 'unknown'

export type CameraFacing = 'user' | 'environment'

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
  liteMode = false,
  facing: CameraFacing = 'user',
): Promise<MediaStream> {
  if (!window.isSecureContext)
    throw Object.assign(new Error(), { name: 'Insecure' })
  if (!navigator.mediaDevices?.getUserMedia)
    throw Object.assign(new Error(), { name: 'Unsupported' })
  const makeConstraints = (mode: CameraFacing): MediaStreamConstraints => ({
    audio: false,
    video: {
      facingMode: { ideal: mode },
      width: { ideal: liteMode ? 960 : 1280 },
      height: { ideal: liteMode ? 540 : 720 },
      frameRate: { ideal: liteMode ? 24 : 30 },
    },
  })
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia(makeConstraints(facing))
  } catch (e) {
    // Graceful fallback if rear camera isn't available on desktop/laptop.
    if (facing === 'environment') {
      stream = await navigator.mediaDevices.getUserMedia(makeConstraints('user'))
    } else {
      throw e
    }
  }
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
