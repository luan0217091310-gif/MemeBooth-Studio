import type {
  BrushId,
  CoverId,
  EffectId,
  EmitterPresetId,
  FilterParams,
  FrameId,
  LayoutId,
  SoundId,
} from './assets'
export type * from './assets'

export type Condition =
  | {
      kind: 'hand'
      gesture: HandGestureId
      minScore?: number
      hands?: 'any' | 'both'
    }
  | { kind: 'face'; blendshape: string; op: '>' | '<'; value: number }
  | { kind: 'derived'; id: DerivedId; minScore?: number }

export type TriggerRule = {
  id: string
  all: Condition[]
  windowMs?: number
  holdMs: number
  cooldownMs: number
  priority: number
  effect: EffectId
}

export type Vec2 = { x: number; y: number }

export type HandGestureId =
  | 'POINT'
  | 'PINCH'
  | 'TWO_FINGER'
  | 'VICTORY'
  | 'OPEN_PALM'
  | 'FIST'
  | 'THUMB_UP'
  | 'THUMB_DOWN'
  | 'I_LOVE_YOU'
export type DerivedId =
  | 'HEART_TWO_HANDS'
  | 'WINK'
  | 'MOUTH_OPEN'
  | 'SMILE'
  | 'PUCKER'
  | 'BROW_UP'
  | 'CHEEK_PUFF'

export interface HandState {
  landmarks: Vec2[]
  handedness: 'Left' | 'Right'
  gestures: Partial<Record<HandGestureId, number>>
}
export interface FaceState {
  landmarks: Vec2[]
  blendshapes: Record<string, number>
  transform?: Float32Array
}
export interface PerceptionSnapshot {
  ts: number
  hands: HandState[]
  faces: FaceState[]
  derived: Partial<Record<DerivedId, number>>
}

export type InteractionMode = 'draw' | 'meme' | 'challenge'
export type DrawState =
  | 'idle'
  | 'hover'
  | 'drawing'
  | 'grabbing'
  | 'erasing'
  | 'paused'
  | 'clearPending'

export interface MemeDef {
  id: string
  source: 'builtin' | 'custom'
  name: string
  caption?: { top?: string; bottom?: string }
  visual: { kind: 'svg'; svg: string } | { kind: 'image'; blobKey: string }
  soundId: SoundId
  fx?: EffectId[]
  trigger: TriggerRule
  includeInChallenge: boolean
}

export interface VibePreset {
  id: string
  name: string
  ui: Record<string, string>
  filter: FilterParams
  brush: { id: BrushId; palette: string[] }
  particles: EmitterPresetId[]
  sounds: { pack: string; bgm: string }
  photoFrame: FrameId
  bookCover: CoverId
  fonts: { ui: string; display: string }
}

export interface BookPage {
  id: string
  bookId: string
  createdAt: number
  photo: Blob
  liveClip?: Blob
  poster?: Blob
  soundIds: SoundId[]
  caption: string
  layout: LayoutId
}

export interface ShareProvider {
  id: 'local' | 'upload'
  isAvailable(): boolean
  share(file: Blob, name: string): Promise<{ qrUrl?: string }>
}

/** Point in display space plus timestamp (ms). */
export type StrokePoint = [x: number, y: number, t: number]

export interface Stroke {
  id: string
  brushId: BrushId
  color: string
  /** Width as a fraction of stage width. */
  width: number
  points: StrokePoint[]
}

export type TextStyle = 'meme' | 'cute'

interface SceneItemBase {
  id: string
  /** Center, display space. */
  x: number
  y: number
  scale: number
  /** Radians. */
  rotation: number
  z: number
}
export interface StickerItem extends SceneItemBase {
  kind: 'sticker'
  stickerId: string
}
export interface TextItem extends SceneItemBase {
  kind: 'text'
  text: string
  style: TextStyle
  color: string
}
export type SceneItem = StickerItem | TextItem
