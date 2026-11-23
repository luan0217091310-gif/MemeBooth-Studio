import { drawConfig } from '@/config/gestures'
import type { DominantGesture } from '@/core/ai/gestures/handGestures'
import type { DrawState } from '@/types'

export interface DrawInput {
  /** Dominant gesture this frame; 'NONE' also when the hand is gone. */
  gesture: DominantGesture
  present: boolean
  /** True when a PINCH point is within grab range of an item. */
  grabHit: boolean
  /** In meme mode drawing and erasing are disabled. */
  allowDraw: boolean
}

export type DrawEvent =
  | 'strokeStart'
  | 'strokeEnd'
  | 'grabStart'
  | 'grabEnd'
  | 'eraseStart'
  | 'eraseEnd'
  | 'clear'

export interface DrawFsm {
  state: DrawState
  candidate: DominantGesture
  candidateSince: number
  /** 0..1 progress of the OPEN_PALM hold towards clearing. */
  clearProgress: number
  /** Latch so one long OPEN_PALM hold clears only once. */
  cleared: boolean
  /** Events produced by the latest step (consumed by the caller). */
  events: DrawEvent[]
}

export function initialFsm(now = 0): DrawFsm {
  return {
    state: 'idle',
    candidate: 'NONE',
    candidateSince: now,
    clearProgress: 0,
    cleared: false,
    events: [],
  }
}

function exitEvents(state: DrawState): DrawEvent[] {
  if (state === 'drawing') return ['strokeEnd']
  if (state === 'grabbing') return ['grabEnd']
  if (state === 'erasing') return ['eraseEnd']
  return []
}

/**
 * Pure transition function `(state, input, now) => state`.
 * Every transition requires the candidate gesture to be stable for a
 * configurable time, so flicker between gestures never draws stray marks.
 */
export function stepDraw(
  prev: DrawFsm,
  input: DrawInput,
  now: number,
): DrawFsm {
  const g: DominantGesture = input.present ? input.gesture : 'NONE'
  const candidateSince = g === prev.candidate ? prev.candidateSince : now
  const held = now - candidateSince
  const c = drawConfig
  let state: DrawState = prev.state
  const events: DrawEvent[] = []
  let clearProgress = 0
  let cleared = g === prev.candidate ? prev.cleared : false

  const go = (next: DrawState, enter: DrawEvent[] = []) => {
    if (next === state) return
    events.push(...exitEvents(state), ...enter)
    state = next
  }

  // Leaving an active state needs the other gesture to persist briefly
  // (pen-up hysteresis), except grabbing which ends as soon as PINCH ends.
  const stableExit = held >= c.penUpMs

  if (!input.present) {
    go('idle')
  } else if (state === 'drawing' && g !== 'POINT') {
    if (stableExit) go(g === 'NONE' ? 'idle' : 'hover')
  } else if (state === 'erasing' && g !== 'TWO_FINGER') {
    if (stableExit) go('hover')
  } else if (state === 'grabbing') {
    if (g !== 'PINCH') go('hover')
  } else {
    switch (g) {
      case 'POINT':
        if (!input.allowDraw) go('hover')
        else if (held >= c.penDownMs) go('drawing', ['strokeStart'])
        else if (state !== 'drawing') go('hover')
        break
      case 'PINCH':
        if (input.grabHit && held >= c.grabMs) go('grabbing', ['grabStart'])
        else go('hover')
        break
      case 'TWO_FINGER':
        if (input.allowDraw && held >= c.eraseMs) go('erasing', ['eraseStart'])
        else go('hover')
        break
      case 'OPEN_PALM':
        if (!input.allowDraw) {
          go('hover')
          break
        }
        if (held >= c.clearMs) {
          if (!cleared) {
            events.push(...exitEvents(state), 'clear')
            cleared = true
          }
          state = 'paused'
          clearProgress = 1
        } else if (held >= c.pauseMs) {
          go(held >= (c.pauseMs + c.clearMs) / 2 ? 'clearPending' : 'paused')
          clearProgress = (held - c.pauseMs) / (c.clearMs - c.pauseMs)
        } else go('hover')
        break
      case 'NONE':
        go('hover')
        break
    }
  }
  return {
    state,
    candidate: g,
    candidateSince,
    clearProgress: Math.max(0, Math.min(1, clearProgress)),
    cleared,
    events,
  }
}
