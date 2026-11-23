export type SoundId = string
export type EffectId = string
export type BrushId = string
export type EmitterPresetId = string
export type FrameId = string
export type CoverId = string
export type LayoutId = 'polaroid' | 'strip' | 'grid' | 'single'
export interface FilterParams {
  brightness: number
  contrast: number
  saturation: number
  tint: [number, number, number]
  vignette: number
  grain: number
  scanline: number
  chromaShift: number
  bloom: number
}
