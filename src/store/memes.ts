import { create } from 'zustand'
import { builtinMemes } from '@/config/memes'
import type { MemeDef, TriggerRule } from '@/types'

interface MemeState {
  memes: MemeDef[]
  /** Rules derived from memes, recomputed on change (read by the render loop). */
  rules: TriggerRule[]
  register(meme: MemeDef): void
  unregister(id: string): void
  byRule(ruleId: string): MemeDef | undefined
}

const rulesOf = (memes: MemeDef[]) => memes.map((m) => m.trigger)

/** Single registry shared by meme mode, challenge and (phase 6) the creator. */
export const useMemes = create<MemeState>((set, get) => ({
  memes: builtinMemes,
  rules: rulesOf(builtinMemes),
  register(meme) {
    const memes = [...get().memes.filter((m) => m.id !== meme.id), meme]
    set({ memes, rules: rulesOf(memes) })
  },
  unregister(id) {
    const memes = get().memes.filter((m) => m.id !== id)
    set({ memes, rules: rulesOf(memes) })
  },
  byRule(ruleId) {
    return get().memes.find((m) => m.trigger.id === ruleId)
  },
}))
