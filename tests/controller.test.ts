import { beforeEach, expect, it } from 'vitest'
import { InteractionController } from '@/core/interaction/controller'
import { createViewport } from '@/core/canvas/viewport'
import { useScene } from '@/store/scene'
import { handPose } from './fixtures/handPose'

const view = createViewport(1280, 720, 1280, 720)
const empty = { ts: 0, hands: [], faces: [], derived: {} }

beforeEach(() => {
  useScene.setState(useScene.getInitialState())
  useScene.getState().commit({
    items: [
      {
        id: 'st',
        kind: 'sticker',
        stickerId: 'heart',
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        z: 1,
      },
    ],
  })
})

it('two handles on one item scale and rotate it', () => {
  const c = new InteractionController()
  c.update(empty, view, 0, null)
  c.pointerDown(1, { x: 0.47, y: 0.5 }, 0)
  c.pointerDown(2, { x: 0.53, y: 0.5 }, 0)
  c.update(empty, view, 16, null)
  // Spread to double distance and rotate 90 degrees around the center.
  const aspect = 720 / 1280
  c.pointerMove(1, { x: 0.5, y: 0.5 - 0.06 / aspect }, 32)
  c.pointerMove(2, { x: 0.5, y: 0.5 + 0.06 / aspect }, 32)
  c.update(empty, view, 48, null)
  const it0 = useScene.getState().items[0]!
  expect(it0.scale).toBeCloseTo(2, 3)
  expect(it0.rotation).toBeCloseTo(Math.PI / 2, 3)
  expect(it0.x).toBeCloseTo(0.5, 3)
  c.pointerUp(1)
  c.pointerUp(2)
  useScene.getState().undo()
  expect(useScene.getState().items[0]!.scale).toBe(1)
})

it('dropping an item on the trash corner deletes it (undoable)', () => {
  const c = new InteractionController()
  c.update(empty, view, 0, null)
  c.pointerDown(1, { x: 0.5, y: 0.5 }, 0)
  c.pointerMove(1, { x: 0.98, y: 0.97 }, 16)
  c.update(empty, view, 16, null)
  expect(c.hud.trash.hot).toBe(true)
  c.pointerUp(1)
  expect(useScene.getState().items).toHaveLength(0)
  useScene.getState().undo()
  expect(useScene.getState().items).toHaveLength(1)
})

it('mouse draws a stroke in manual draw mode and survives a mode switch', () => {
  useScene.getState().setMode('draw')
  const c = new InteractionController()
  c.update(empty, view, 0, null)
  c.pointerDown(5, { x: 0.1, y: 0.1 }, 0)
  c.pointerMove(5, { x: 0.2, y: 0.15 }, 16)
  c.pointerUp(5)
  useScene.getState().setMode('meme')
  expect(useScene.getState().strokes).toHaveLength(1)
  expect(useScene.getState().strokes[0]!.points).toHaveLength(2)
})

it('pointing a hand never auto-draws stray strokes on the stage', () => {
  useScene.getState().setMode('draw')
  const c = new InteractionController()
  const lm = handPose([true, false, false, false])
  const snap = {
    ts: 0,
    hands: [
      {
        landmarks: lm,
        handedness: 'Right' as const,
        gestures: { POINT: 0.95 },
      },
    ],
    faces: [],
    derived: {},
  }
  for (let t = 0; t <= 400; t += 16) c.update(snap, view, t, null)
  expect(c.activeStrokes).toHaveLength(0)
  expect(useScene.getState().strokes).toHaveLength(0)
})
