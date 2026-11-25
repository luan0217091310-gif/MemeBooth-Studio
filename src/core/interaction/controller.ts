import { drawConfig } from '@/config/gestures'
import { dominant } from '@/core/ai/gestures/handGestures'
import { eraseStrokes } from '@/core/canvas/brushes/erase'
import { hitItem } from '@/core/canvas/items'
import { toPixel, type Viewport } from '@/core/canvas/viewport'
import { vi } from '@/i18n/vi'
import { newId, useScene } from '@/store/scene'
import { useUi } from '@/store/ui'
import type {
  HandState,
  PerceptionSnapshot,
  SceneItem,
  Stroke,
  Vec2,
} from '@/types'
import { initialFsm, stepDraw, type DrawFsm } from './drawFsm'

export type CursorKind =
  'point' | 'pen' | 'grab' | 'grabbing' | 'erase' | 'pause'

export interface Cursor {
  pos: Vec2
  kind: CursorKind
  color: string
  /** 0..1 hold progress (clear board). */
  progress: number
}

export interface HudState {
  cursors: Cursor[]
  /** Items hovered by a pinch or being dragged (HUD outlines them). */
  highlight: Set<string>
  trash: { visible: boolean; hot: boolean }
  eraserRadius: number
}

interface Handle {
  itemId: string
  pos: Vec2
  /** Item center minus handle position at grab time (width units, y*aspect). */
  offX: number
  offY: number
}

interface PairBase {
  dist: number
  angle: number
  scale: number
  rotation: number
  /** Item center relative to the pair midpoint (width units). */
  cx: number
  cy: number
}

interface HandSlot {
  fsm: DrawFsm
  pen: Vec2 | null
  stroke: Stroke | null
  seen: boolean
}

interface PointerSlot {
  kind: 'draw' | 'grab' | 'erase'
  stroke?: Stroke
}

const TRASH_PX = 76
const TRASH_INSET = 14

/**
 * Turns hand landmarks and pointer events into scene edits. One pipeline for
 * fingers, mouse and touch: every input becomes a "handle" (grab), a stroke,
 * or an eraser position.
 */
export class InteractionController {
  private hands = new Map<string, HandSlot>()
  private pointers = new Map<number, PointerSlot>()
  private handles = new Map<string, Handle>()
  private pairs = new Map<string, PairBase>()
  private erasing = new Map<string, Vec2>()
  private view!: Viewport
  aspect = 9 / 16
  readonly hud: HudState = {
    cursors: [],
    highlight: new Set(),
    trash: { visible: false, hot: false },
    eraserRadius: drawConfig.eraserRadius,
  }

  /** Live strokes being drawn (rendered by the creative layer each frame). */
  get activeStrokes(): Stroke[] {
    const out: Stroke[] = []
    for (const h of this.hands.values()) if (h.stroke) out.push(h.stroke)
    for (const p of this.pointers.values()) if (p.stroke) out.push(p.stroke)
    return out
  }

  // ---------- shared primitives ----------

  private beginStroke(at: Vec2, t: number): Stroke {
    const { brushId, color, width } = useScene.getState()
    return { id: newId('s'), brushId, color, width, points: [[at.x, at.y, t]] }
  }

  private extend(stroke: Stroke, at: Vec2, t: number): void {
    const last = stroke.points[stroke.points.length - 1]
    if (last) {
      const d = Math.hypot(at.x - last[0], (at.y - last[1]) * this.aspect)
      if (d < drawConfig.minPointDist) return
    }
    stroke.points.push([at.x, at.y, t])
  }

  private finishStroke(stroke: Stroke | null | undefined): void {
    if (!stroke || stroke.points.length === 0) return
    const { strokes, commit } = useScene.getState()
    commit({ strokes: [...strokes, stroke] })
  }

  private eraseAt(p: Vec2): void {
    const s = useScene.getState()
    const next = eraseStrokes(
      s.strokes,
      p,
      drawConfig.eraserRadius,
      this.aspect,
    )
    if (next !== s.strokes)
      useScene.setState({ strokes: next, version: s.version + 1 })
  }

  private grab(key: string, p: Vec2): boolean {
    const { items, checkpoint } = useScene.getState()
    const item = hitItem(items, p, this.aspect)
    if (!item) return false
    const alreadyHeld = [...this.handles.values()].some(
      (h) => h.itemId === item.id,
    )
    if (!alreadyHeld) {
      checkpoint()
      // Bring to front.
      const top = Math.max(0, ...items.map((i) => i.z))
      useScene.getState().patchItem(item.id, { z: top + 1 })
    }
    this.handles.set(key, {
      itemId: item.id,
      pos: { ...p },
      offX: item.x - p.x,
      offY: (item.y - p.y) * this.aspect,
    })
    this.pairs.delete(item.id)
    return true
  }

  private release(key: string): void {
    const h = this.handles.get(key)
    if (!h) return
    this.handles.delete(key)
    this.pairs.delete(h.itemId)
    // Re-base any remaining single handle so the item does not jump.
    const item = useScene.getState().items.find((i) => i.id === h.itemId)
    for (const other of this.handles.values()) {
      if (other.itemId !== h.itemId || !item) continue
      other.offX = item.x - other.pos.x
      other.offY = (item.y - other.pos.y) * this.aspect
    }
    const stillHeld = [...this.handles.values()].some(
      (o) => o.itemId === h.itemId,
    )
    if (!stillHeld && this.inTrash(h.pos)) {
      const s = useScene.getState()
      // Deletion replaces the checkpointed drag in one undo step.
      useScene.setState({ items: s.items.filter((i) => i.id !== h.itemId) })
    }
  }

  private inTrash(p: Vec2): boolean {
    if (!this.view) return false
    const px = toPixel(this.view, p)
    return (
      px.x > this.view.width - TRASH_INSET - TRASH_PX &&
      px.y > this.view.height - TRASH_INSET - TRASH_PX
    )
  }

  /** Applies all handles to their items (1 handle = move, 2 = move+scale+rotate). */
  private applyHandles(): void {
    if (this.handles.size === 0) return
    const byItem = new Map<string, Handle[]>()
    for (const h of this.handles.values()) {
      const list = byItem.get(h.itemId) ?? []
      list.push(h)
      byItem.set(h.itemId, list)
    }
    const { items, patchItem } = useScene.getState()
    for (const [itemId, hs] of byItem) {
      const item = items.find((i) => i.id === itemId)
      if (!item) continue
      if (hs.length === 1) {
        const h = hs[0]!
        patchItem(itemId, {
          x: h.pos.x + h.offX,
          y: h.pos.y + h.offY / this.aspect,
        })
        continue
      }
      const [a, b] = hs as [Handle, Handle]
      const ax = a.pos.x
      const ay = a.pos.y * this.aspect
      const bx = b.pos.x
      const by = b.pos.y * this.aspect
      const dist = Math.max(1e-4, Math.hypot(bx - ax, by - ay))
      const angle = Math.atan2(by - ay, bx - ax)
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2
      let base = this.pairs.get(itemId)
      if (!base) {
        base = {
          dist,
          angle,
          scale: item.scale,
          rotation: item.rotation,
          cx: item.x - mx,
          cy: item.y * this.aspect - my,
        }
        this.pairs.set(itemId, base)
      }
      const k = dist / base.dist
      const da = angle - base.angle
      const cos = Math.cos(da)
      const sin = Math.sin(da)
      const cx = (base.cx * cos - base.cy * sin) * k
      const cy = (base.cx * sin + base.cy * cos) * k
      patchItem(itemId, {
        scale: Math.min(8, Math.max(0.2, base.scale * k)),
        rotation: base.rotation + da,
        x: mx + cx,
        y: (my + cy) / this.aspect,
      })
    }
  }

  // ---------- hands ----------

  private updateHand(
    hand: HandState,
    key: string,
    now: number,
  ): void {
    let slot = this.hands.get(key)
    if (!slot) {
      slot = { fsm: initialFsm(now), pen: null, stroke: null, seen: true }
      this.hands.set(key, slot)
    }
    slot.seen = true
    const lm = hand.landmarks
    const tip = lm[8]!
    const pinchPt = { x: (lm[4]!.x + tip.x) / 2, y: (lm[4]!.y + tip.y) / 2 }
    // Extra light EMA on the fingertip on top of One Euro.
    const a = drawConfig.penEmaAlpha
    slot.pen = slot.pen
      ? {
          x: slot.pen.x + (tip.x - slot.pen.x) * a,
          y: slot.pen.y + (tip.y - slot.pen.y) * a,
        }
      : { ...tip }
    const gesture = dominant(hand.gestures)
    const items = useScene.getState().items
    const hovered =
      gesture === 'PINCH' ? hitItem(items, pinchPt, this.aspect) : null
    // Automatic air-drawing with hands is disabled so gestures never leave stray strokes.
    // Hands can still PINCH to grab/scale/rotate stickers & text and POINT to dwell-click UI.
    const fsm = stepDraw(
      slot.fsm,
      {
        gesture,
        present: true,
        grabHit: !!hovered,
        allowDraw: false,
      },
      now,
    )
    slot.fsm = fsm
    this.handleEvents(slot, key, fsm, pinchPt, now)
    const h = this.handles.get(key)
    if (h) h.pos = pinchPt
    if (hovered) this.hud.highlight.add(hovered.id)
    const color = useScene.getState().color
    const kind: CursorKind =
      fsm.state === 'grabbing'
        ? 'grabbing'
        : gesture === 'PINCH'
          ? 'grab'
          : 'point'
    // Only show a subtle hand cursor when pinching/grabbing or pointing cleanly.
    if (kind === 'grab' || kind === 'grabbing' || gesture === 'POINT') {
      this.hud.cursors.push({
        pos: kind === 'grab' || kind === 'grabbing' ? pinchPt : slot.pen,
        kind,
        color,
        progress: 0,
      })
    }
  }

  private handleEvents(
    slot: HandSlot,
    key: string,
    fsm: DrawFsm,
    pinchPt: Vec2,
    now: number,
  ): void {
    for (const e of fsm.events) {
      switch (e) {
        case 'strokeStart':
          slot.stroke = this.beginStroke(slot.pen!, now)
          break
        case 'strokeEnd':
          this.finishStroke(slot.stroke)
          slot.stroke = null
          break
        case 'grabStart':
          this.grab(key, pinchPt)
          break
        case 'grabEnd':
          this.release(key)
          break
        case 'eraseStart':
          useScene.getState().checkpoint()
          break
        case 'eraseEnd':
          this.erasing.delete(key)
          break
        case 'clear':
          this.clearBoard()
          break
      }
    }
  }

  clearBoard(): void {
    const s = useScene.getState()
    if (!s.strokes.length && !s.items.length) return
    s.clear()
    useUi.getState().showToast({
      text: vi.draw.cleared,
      actionLabel: vi.draw.undo,
      action: () => useScene.getState().undo(),
      ttl: drawConfig.clearUndoToastMs,
    })
  }

  // ---------- pointer (mouse / touch / pen) ----------

  pointerDown(id: number, p: Vec2, now: number): void {
    const { mode, tool } = useScene.getState()
    if (this.grab('ptr' + id, p)) {
      this.pointers.set(id, { kind: 'grab' })
      return
    }
    if (mode !== 'draw') return
    if (tool === 'eraser') {
      useScene.getState().checkpoint()
      this.pointers.set(id, { kind: 'erase' })
      this.eraseAt(p)
      return
    }
    this.pointers.set(id, { kind: 'draw', stroke: this.beginStroke(p, now) })
  }

  pointerMove(id: number, p: Vec2, now: number): void {
    const slot = this.pointers.get(id)
    if (!slot) return
    if (slot.kind === 'draw' && slot.stroke) this.extend(slot.stroke, p, now)
    else if (slot.kind === 'erase') this.eraseAt(p)
    else {
      const h = this.handles.get('ptr' + id)
      if (h) h.pos = { ...p }
    }
  }

  pointerUp(id: number): void {
    const slot = this.pointers.get(id)
    if (!slot) return
    this.pointers.delete(id)
    if (slot.kind === 'draw') this.finishStroke(slot.stroke)
    else if (slot.kind === 'grab') this.release('ptr' + id)
  }

  /** Mouse wheel over an item: scale (or rotate with Shift). */
  wheel(p: Vec2, deltaY: number, rotate: boolean): boolean {
    const item = hitItem(useScene.getState().items, p, this.aspect, 0)
    if (!item) return false
    const patch: Partial<SceneItem> = rotate
      ? { rotation: item.rotation + deltaY * 0.002 }
      : {
          scale: Math.min(
            8,
            Math.max(0.2, item.scale * Math.exp(-deltaY * 0.0015)),
          ),
        }
    useScene.getState().patchItem(item.id, patch)
    return true
  }

  // ---------- per frame ----------

  update(
    snapshot: PerceptionSnapshot,
    view: Viewport,
    now: number,
    pointer: Vec2 | null,
  ): void {
    this.view = view
    this.aspect = view.srcHeight / view.srcWidth
    this.hud.cursors.length = 0
    this.hud.highlight.clear()
    this.erasing.clear()
    const allowMouseDraw = useScene.getState().mode === 'draw'
    for (const slot of this.hands.values()) slot.seen = false
    const counts: Record<string, number> = {}
    for (const hand of snapshot.hands) {
      const n = (counts[hand.handedness] = (counts[hand.handedness] ?? 0) + 1)
      this.updateHand(hand, 'hand-' + hand.handedness + n, now)
    }
    // Hands that disappeared: close their grabs.
    for (const [key, slot] of this.hands) {
      if (slot.seen) continue
      const fsm = stepDraw(
        slot.fsm,
        { gesture: 'NONE', present: false, grabHit: false, allowDraw: false },
        now,
      )
      this.handleEvents(slot, key, fsm, slot.pen ?? { x: 0, y: 0 }, now)
      this.hands.delete(key)
    }
    this.applyHandles()
    for (const h of this.handles.values()) this.hud.highlight.add(h.itemId)
    const anyGrab = this.handles.size > 0
    let hot = false
    if (anyGrab)
      for (const h of this.handles.values()) hot ||= this.inTrash(h.pos)
    this.hud.trash.visible = anyGrab
    this.hud.trash.hot = hot
    // Show eraser radius preview ring only when actively using manual eraser with mouse.
    if (pointer && allowMouseDraw && useScene.getState().tool === 'eraser') {
      this.hud.cursors.push({
        pos: pointer,
        kind: 'erase',
        color: useScene.getState().color,
        progress: 0,
      })
    }
  }

  get trashRect() {
    return { size: TRASH_PX, inset: TRASH_INSET }
  }

  reset(): void {
    for (const [key, slot] of this.hands) {
      this.finishStroke(slot.stroke)
      this.release(key)
    }
    this.hands.clear()
    for (const id of [...this.pointers.keys()]) this.pointerUp(id)
  }
}
