import type { VisionConfig } from '@/config/gestures'

export type Delegate = 'GPU' | 'CPU'

/** Raw model output in image space (not mirrored). Plain data for postMessage. */
export interface RawHand {
  landmarks: Float32Array // 21 * 2 (x, y)
  handedness: string
  gestures: { name: string; score: number }[]
}
export interface RawFace {
  landmarks: Float32Array // 478 * 2
  blendshapes: { name: string; score: number }[]
  transform?: Float32Array
}
export interface RawResult {
  ts: number
  /** Undefined when that model did not run this tick. */
  hands?: RawHand[]
  faces?: RawFace[]
  inferenceMs: number
}

export type VisionErrorCode =
  'wasm-load' | 'model-fetch' | 'model-init' | 'inference' | 'unsupported'

export type ToWorker =
  | { type: 'init'; config: VisionConfig; delegate: Delegate; origin: string }
  | { type: 'frame'; bitmap: ImageBitmap; ts: number }
  | { type: 'setOptions'; numFaces?: number; runBoth?: boolean }
  | { type: 'dispose' }

export type FromWorker =
  | { type: 'progress'; percent: number }
  | { type: 'ready'; delegate: Delegate }
  | { type: 'result'; result: RawResult }
  | { type: 'error'; code: VisionErrorCode; message: string }
