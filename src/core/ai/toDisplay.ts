import type { Vec2 } from '@/types'

// The ONLY place raw MediaPipe image coordinates become display space.
let mirrored = true

export function setMirror(value: boolean): void {
  mirrored = value
}
export function isMirrored(): boolean {
  return mirrored
}

export function toDisplay(p: { x: number; y: number }): Vec2 {
  return { x: mirrored ? 1 - p.x : p.x, y: p.y }
}

/**
 * MediaPipe labels handedness from the subject's point of view assuming a
 * mirrored (selfie) input. We feed it the raw, un-mirrored camera frame, so
 * its label is flipped relative to the person. Normalize to the person's real
 * hand here; verified manually by raising the right hand (see docs/browser-matrix.md).
 */
export function normalizeHandedness(label: string): 'Left' | 'Right' {
  const raw: 'Left' | 'Right' = label === 'Left' ? 'Left' : 'Right'
  return raw === 'Left' ? 'Right' : 'Left'
}
