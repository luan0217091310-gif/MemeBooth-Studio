import { beforeEach, expect, it } from 'vitest'
import { eraseStrokes } from '@/core/canvas/brushes/erase'
import { hitItem } from '@/core/canvas/items'
import { useScene } from '@/store/scene'
import type { SceneItem, Stroke } from '@/types'

const line = (id: string): Stroke => ({
  id,
  brushId: 'pastel',
  color: '#000',
  width: 0.01,
  points: Array.from(
    { length: 11 },
    (_, i) => [0.1 + i * 0.08, 0.5, i * 16] as [number, number, number],
  ),
})

beforeEach(() => useScene.setState(useScene.getInitialState()))

it('vector eraser splits a stroke into two sub-strokes', () => {
  const out = eraseStrokes([line('a')], { x: 0.5, y: 0.5 }, 0.05)
  expect(out).toHaveLength(2)
  expect(out[0]!.points.at(-1)![0]).toBeLessThan(0.45)
  expect(out[1]!.points[0]![0]).toBeGreaterThan(0.55)
  expect(new Set(out.map((s) => s.id)).size).toBe(2)
})
it('eraser returns the same array when nothing is hit', () => {
  const strokes = [line('a')]
  expect(eraseStrokes(strokes, { x: 0.5, y: 0.9 }, 0.05)).toBe(strokes)
})
it('undo/redo restores at least 50 steps and clear is undoable', () => {
  const s = useScene.getState()
  for (let i = 0; i < 55; i++)
    s.commit({ strokes: [...useScene.getState().strokes, line('s' + i)] })
  useScene.getState().clear()
  expect(useScene.getState().strokes).toHaveLength(0)
  useScene.getState().undo()
  expect(useScene.getState().strokes).toHaveLength(55)
  for (let i = 0; i < 50; i++) useScene.getState().undo()
  expect(useScene.getState().strokes).toHaveLength(5)
  useScene.getState().redo()
  expect(useScene.getState().strokes).toHaveLength(6)
})
it('pinch hit-test finds the nearest item within 6% width', () => {
  const items: SceneItem[] = [
    {
      id: 'a',
      kind: 'sticker',
      stickerId: 'heart',
      x: 0.3,
      y: 0.5,
      scale: 1,
      rotation: 0,
      z: 1,
    },
    {
      id: 'b',
      kind: 'sticker',
      stickerId: 'star',
      x: 0.7,
      y: 0.5,
      scale: 1,
      rotation: 0,
      z: 2,
    },
  ]
  expect(hitItem(items, { x: 0.32, y: 0.5 }, 0.5625)?.id).toBe('a')
  expect(hitItem(items, { x: 0.5, y: 0.5 }, 0.5625)).toBeNull()
})
