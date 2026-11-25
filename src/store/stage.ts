import { create } from 'zustand'
import type { CameraError, CameraFacing } from '@/core/camera'
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

export interface LiveInfo {
  derived: Record<string, number>
  blendshapes: Record<string, number>
  scores: Record<string, number>
  gestures: Record<string, number>[]
  particles: number
}

export interface GestureRadar {
  /** Comma-joined sorted active gesture/expression IDs (cheap equality check). */
  activeKey: string
  /** Highest-confidence detected gesture/expression ID, or null. */
  topId: string | null
  /** Rule currently charging up to fire (name + 0..1 progress). */
  pending: { name: string; progress: number } | null
  hands: number
  faces: number
}

interface StageState {
  live: LiveInfo
  radar: GestureRadar
  camera: CameraStatus
  cameraError?: CameraError
  vision: VisionStatus
  visionError?: VisionErrorCode
  visionMessage?: string
  progress: number
  slowLoad: boolean
  mirror: boolean
  facing: CameraFacing
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
  facing: 'user',
  perf: initialPerf,
  live: {
    derived: {},
    blendshapes: {},
    scores: {},
    gestures: [],
    particles: 0,
  },
  radar: {
    activeKey: '',
    topId: null,
    pending: null,
    hands: 0,
    faces: 0,
  },
  set: (partial) => set(partial),
}))
