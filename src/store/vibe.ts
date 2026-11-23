import { create } from 'zustand'
import { soundPacks, vibeById, vibes } from '@/config/vibes'
import { setSoundPack } from '@/core/audio/soundRegistry'
import { useScene } from './scene'
import type { VibePreset } from '@/types'

interface VibeState {
  vibeId: string
  preset: VibePreset
  setVibe(id: string): void
}

const KEY = 'memebooth.vibe'
function initial(): string {
  try {
    return localStorage.getItem(KEY) ?? vibes[0]!.id
  } catch {
    return vibes[0]!.id
  }
}

/** Listeners that apply a vibe outside React (camera filter, particles...). */
const appliers = new Set<(p: VibePreset) => void>()
export function onVibe(fn: (p: VibePreset) => void): () => void {
  appliers.add(fn)
  fn(useVibe.getState().preset)
  return () => appliers.delete(fn)
}

/**
 * One call re-themes everything synchronously: UI tokens (CSS variables via
 * data-vibe + inline vars), camera filter, default brush + palette, particle
 * set, sound pack. Scene content (strokes, items) is never touched.
 */
export const useVibe = create<VibeState>((set) => {
  const id = initial()
  const preset = vibeById(id)
  setSoundPack(soundPacks[preset.sounds.pack] ?? {})
  return {
    vibeId: preset.id,
    preset,
    setVibe(next) {
      const p = vibeById(next)
      setSoundPack(soundPacks[p.sounds.pack] ?? {})
      const scene = useScene.getState()
      // New strokes use the vibe brush; existing strokes keep their own.
      scene.setBrush(p.brush.id)
      if (!p.brush.palette.includes(scene.color))
        scene.setColor(p.brush.palette[0]!)
      try {
        localStorage.setItem(KEY, p.id)
      } catch {
        /* storage may be unavailable (private mode); vibe still applies */
      }
      set({ vibeId: p.id, preset: p })
      for (const fn of appliers) fn(p)
    },
  }
})

/** CSS variables for the root element. */
export function vibeStyle(p: VibePreset): Record<string, string> {
  return p.ui
}
