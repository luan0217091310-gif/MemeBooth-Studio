import { create } from 'zustand'
import type { CameraError } from '@/core/camera'
import type { VisionErrorCode } from '@/core/ai/protocol'

export type CameraStatus =
  'idle' | 'requesting' | 'live' | 'error' | 'ended' | 'off'
export type VisionStatus = 'idle' | 'loading' | 'ready' | 'error' | 'off'

export interface PerfInfo {
  fps: number
  p95: number
  inferenceFps: number
  inferenceMs: number
  runtime: 'worker' | 'main' | 'off'
  delegate: 'GPU' | 'CPU' | '-'
  renderer: 'webgl2' | 'canvas2d' | '-'
  runBoth: boolean
  hands: number
  faces: number
  handLabels: string
}

interface StageState {
  camera: CameraStatus
  cameraError?: CameraError
  vision: VisionStatus
  visionError?: VisionErrorCode
  visionMessage?: string
  progress: number
  slowLoad: boolean
  mirror: boolean
  perf: PerfInfo
  set(partial: Partial<Omit<StageState, 'set'>>): void
}

export const initialPerf: PerfInfo = {
  fps: 0,
  p95: 0,
  inferenceFps: 0,
  inferenceMs: 0,
  runtime: 'off',
  delegate: '-',
  renderer: '-',
  runBoth: false,
  hands: 0,
  faces: 0,
  handLabels: '',
}

export const useStage = create<StageState>((set) => ({
  camera: 'idle',
  vision: 'idle',
  progress: 0,
  slowLoad: false,
  mirror: true,
  perf: initialPerf,
  set: (partial) => set(partial),
}))
