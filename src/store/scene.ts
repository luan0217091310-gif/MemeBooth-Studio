import { create } from 'zustand'
import { drawConfig } from '@/config/gestures'
import type { BrushId, InteractionMode, SceneItem, Stroke } from '@/types'

interface SceneData {
  strokes: readonly Stroke[]
  items: readonly SceneItem[]
}

export type Tool = 'pen' | 'eraser'

interface SceneState extends SceneData {
  past: SceneData[]
  future: SceneData[]
  /** Bumps whenever strokes change, so the stroke cache can rebuild. */
  version: number
  mode: InteractionMode
  tool: Tool
  brushId: BrushId
  color: string
  width: number
  /** Replace scene content as one undoable step. */
  commit(next: Partial<SceneData>): void
  /** Push the current content to the undo stack before live edits. */
  checkpoint(): void
  /** Mutate without an undo entry (live dragging); call commit-less. */
  patchItem(id: string, patch: Partial<SceneItem>): void
  undo(): void
  redo(): void
  clear(): void
  setMode(mode: InteractionMode): void
  setTool(tool: Tool): void
  setBrush(brushId: BrushId): void
  setColor(color: string): void
  setWidth(width: number): void
}

let idCounter = 0
export const newId = (prefix: string) =>
  prefix + Date.now().toString(36) + (++idCounter).toString(36)

export const useScene = create<SceneState>((set, get) => ({
  strokes: [],
  items: [],
  past: [],
  future: [],
  version: 0,
  mode: 'draw',
  tool: 'pen',
  brushId: 'pastel',
  color: '#ff5fa2',
  width: 0.008,
  commit(next) {
    const { strokes, items, past, version } = get()
    const prev = { strokes, items }
    set({
      ...prev,
      ...next,
      past: [...past, prev].slice(-drawConfig.undoLimit),
      future: [],
      version: version + 1,
    })
  },
  checkpoint() {
    const { strokes, items, past } = get()
    set({
      past: [...past, { strokes, items }].slice(-drawConfig.undoLimit),
      future: [],
    })
  },
  patchItem(id, patch) {
    set({
      items: get().items.map((it) =>
        it.id === id ? ({ ...it, ...patch } as SceneItem) : it,
      ),
    })
  },
  undo() {
    const { past, future, strokes, items, version } = get()
    const prev = past[past.length - 1]
    if (!prev) return
    set({
      ...prev,
      past: past.slice(0, -1),
      future: [...future, { strokes, items }],
      version: version + 1,
    })
  },
  redo() {
    const { past, future, strokes, items, version } = get()
    const next = future[future.length - 1]
    if (!next) return
    set({
      ...next,
      past: [...past, { strokes, items }],
      future: future.slice(0, -1),
      version: version + 1,
    })
  },
  clear() {
    const { strokes, items } = get()
    if (strokes.length || items.length) get().commit({ strokes: [], items: [] })
  },
  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),
  setBrush: (brushId) => set({ brushId, tool: 'pen' }),
  setColor: (color) => set({ color, tool: 'pen' }),
  setWidth: (width) => set({ width }),
}))
