import type { Vec2 } from '@/types'

// Single source of truth for display space [0..1] <-> CSS pixel conversions.
// The stage fills its box with `cover` fit, so part of the camera frame may be cropped.
export interface Viewport {
  /** Stage box size in CSS pixels. */
  width: number
  height: number
  /** Source (camera) frame size in pixels. */
  srcWidth: number
  srcHeight: number
  /** Derived cover transform: display-space unit -> stage pixel. */
  scale: number
  offsetX: number
  offsetY: number
}

export function createViewport(
  width: number,
  height: number,
  srcWidth: number,
  srcHeight: number,
): Viewport {
  const sw = srcWidth > 0 ? srcWidth : width
  const sh = srcHeight > 0 ? srcHeight : height
  const scale = Math.max(width / sw, height / sh)
  return {
    width,
    height,
    srcWidth: sw,
    srcHeight: sh,
    scale,
    offsetX: (width - sw * scale) / 2,
    offsetY: (height - sh * scale) / 2,
  }
}

export function toPixel(
  v: Viewport,
  p: Vec2,
  out: Vec2 = { x: 0, y: 0 },
): Vec2 {
  out.x = v.offsetX + p.x * v.srcWidth * v.scale
  out.y = v.offsetY + p.y * v.srcHeight * v.scale
  return out
}

export function fromPixel(
  v: Viewport,
  px: number,
  py: number,
  out: Vec2 = { x: 0, y: 0 },
): Vec2 {
  out.x = (px - v.offsetX) / (v.srcWidth * v.scale)
  out.y = (py - v.offsetY) / (v.srcHeight * v.scale)
  return out
}

/** Length in pixels of a display-space distance measured along x. */
export function lengthToPixel(v: Viewport, d: number): number {
  return d * v.srcWidth * v.scale
}

/** Visible region of the source frame in display space (cover crop). */
export function visibleRect(v: Viewport) {
  const a = fromPixel(v, 0, 0)
  const b = fromPixel(v, v.width, v.height)
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }
}

export const MAX_DPR = 2
export function stageDpr(liteMode = false): number {
  if (liteMode) return 1
  return Math.min(globalThis.devicePixelRatio || 1, MAX_DPR)
}
