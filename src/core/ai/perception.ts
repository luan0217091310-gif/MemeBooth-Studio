import { smoothingConfig, visionConfig } from '@/config/gestures'
import type {
  FaceState,
  HandGestureId,
  HandState,
  PerceptionSnapshot,
  Vec2,
} from '@/types'
import { Ema } from './filters/ema'
import { classifyGeometry, type GeometryState } from './gestures/handGestures'
import { PointSetFilter, type OneEuroParams } from './filters/oneEuro'
import type { RawResult } from './protocol'
import { normalizeHandedness, toDisplay } from './toDisplay'

const BUILTIN: Record<string, HandGestureId> = {
  Victory: 'VICTORY',
  Open_Palm: 'OPEN_PALM',
  Closed_Fist: 'FIST',
  Thumb_Up: 'THUMB_UP',
  Thumb_Down: 'THUMB_DOWN',
  ILoveYou: 'I_LOVE_YOU',
}

interface Keyframe {
  t: number
  points: Vec2[]
}

class Track {
  prev?: Keyframe
  latest?: Keyframe
  lastSeen = 0
  readonly filter: PointSetFilter
  readonly lerped: Vec2[] = []
  readonly out: Vec2[] = []
  constructor(params: OneEuroParams) {
    this.filter = new PointSetFilter(params)
  }

  push(t: number, points: Vec2[]): void {
    this.prev = this.latest
    this.latest = { t, points }
    this.lastSeen = t
  }

  /** Interpolates one inference interval behind `now`, then One Euro filters. */
  sample(now: number, interval: number): Vec2[] {
    const b = this.latest!
    const a = this.prev
    const n = b.points.length
    if (!a || a.points.length !== n || b.t <= a.t) {
      for (let i = 0; i < n; i++) {
        const p = this.lerped[i] ?? (this.lerped[i] = { x: 0, y: 0 })
        p.x = b.points[i]!.x
        p.y = b.points[i]!.y
      }
    } else {
      const k = Math.min(1, Math.max(0, (now - interval - a.t) / (b.t - a.t)))
      for (let i = 0; i < n; i++) {
        const p = this.lerped[i] ?? (this.lerped[i] = { x: 0, y: 0 })
        const pa = a.points[i]!
        const pb = b.points[i]!
        p.x = pa.x + (pb.x - pa.x) * k
        p.y = pa.y + (pb.y - pa.y) * k
      }
    }
    this.lerped.length = n
    this.filter.apply(this.lerped, now, this.out)
    return this.out
  }
}

class HandTrack extends Track {
  handedness: 'Left' | 'Right' = 'Right'
  readonly scores = new Map<HandGestureId, Ema>()
  readonly gestures: Partial<Record<HandGestureId, number>> = {}
  readonly geo: GeometryState = { pinch: false }
  readonly pointingUp = new Ema(smoothingConfig.scoreAlpha)
  pointingScore = 0
}

class FaceTrack extends Track {
  blendshapes: Record<string, number> = {}
  transform?: Float32Array
}

function unpack(data: Float32Array): Vec2[] {
  const out: Vec2[] = new Array(data.length / 2)
  for (let i = 0; i < out.length; i++)
    out[i] = toDisplay({ x: data[i * 2]!, y: data[i * 2 + 1]! })
  return out
}

/**
 * Turns sparse 15-20 fps model results into a smooth 60 fps snapshot.
 * Owns the single raw->display conversion (via toDisplay).
 */
export class PerceptionTracker {
  private hands: HandTrack[] = []
  private faces: FaceTrack[] = []
  private interval = 1000 / visionConfig.targetFps
  private lastResultTs = 0
  params: OneEuroParams = { ...smoothingConfig }
  /** srcHeight / srcWidth, so geometry distances are isotropic. */
  aspect = 9 / 16
  readonly snapshot: PerceptionSnapshot = {
    ts: 0,
    hands: [],
    faces: [],
    derived: {},
  }
  private handStates: HandState[] = []
  private faceStates: FaceState[] = []

  setParams(params: Partial<OneEuroParams>): void {
    Object.assign(this.params, params)
    for (const t of [...this.hands, ...this.faces])
      Object.assign(t.filter.params, this.params)
  }

  ingest(result: RawResult): void {
    if (this.lastResultTs)
      this.interval =
        this.interval * 0.8 + (result.ts - this.lastResultTs) * 0.2
    this.lastResultTs = result.ts
    if (result.hands) this.ingestHands(result)
    if (result.faces) {
      result.faces.forEach((raw, i) => {
        const track =
          this.faces[i] ?? (this.faces[i] = new FaceTrack(this.params))
        track.push(result.ts, unpack(raw.landmarks))
        const bs: Record<string, number> = {}
        for (const b of raw.blendshapes) bs[b.name] = b.score
        track.blendshapes = bs
        track.transform = raw.transform
      })
    }
  }

  private ingestHands(result: RawResult): void {
    const used = new Set<HandTrack>()
    for (const raw of result.hands!) {
      const handedness = normalizeHandedness(raw.handedness)
      const points = unpack(raw.landmarks)
      // Match by handedness first, then by nearest wrist.
      let track = this.hands.find(
        (h) => !used.has(h) && h.handedness === handedness,
      )
      if (!track) {
        let best = Infinity
        for (const h of this.hands) {
          if (used.has(h) || !h.latest) continue
          const w = h.latest.points[0]!
          const d = Math.hypot(w.x - points[0]!.x, w.y - points[0]!.y)
          if (d < best) {
            best = d
            track = h
          }
        }
      }
      if (!track) {
        track = new HandTrack(this.params)
        this.hands.push(track)
      }
      used.add(track)
      track.handedness = handedness
      track.push(result.ts, points)
      const pointing = raw.gestures.find((g) => g.name === 'Pointing_Up')
      track.pointingScore = track.pointingUp.next(pointing?.score ?? 0)
      const seen = new Set<HandGestureId>()
      for (const g of raw.gestures) {
        const id = BUILTIN[g.name]
        if (!id) continue
        seen.add(id)
        let ema = track.scores.get(id)
        if (!ema)
          track.scores.set(id, (ema = new Ema(smoothingConfig.scoreAlpha)))
        track.gestures[id] = ema.next(g.score)
      }
      for (const [id, ema] of track.scores)
        if (!seen.has(id)) track.gestures[id] = ema.next(0)
    }
  }

  /** Builds the snapshot for this render frame. Reuses objects; no per-frame churn beyond arrays already sized. */
  sample(now: number): PerceptionSnapshot {
    this.hands = this.hands.filter((h) => {
      const alive =
        now - h.lastSeen <= visionConfig.handLossGraceMs + this.interval
      if (!alive) h.filter.reset()
      return alive
    })
    this.faces = this.faces.filter(
      (f) =>
        now - f.lastSeen <= visionConfig.faceLossGraceMs + this.interval * 2,
    )
    const s = this.snapshot
    s.ts = now
    this.handStates.length = this.hands.length
    for (let i = 0; i < this.hands.length; i++) {
      const h = this.hands[i]!
      const state =
        this.handStates[i] ??
        (this.handStates[i] = {
          landmarks: [],
          handedness: 'Right',
          gestures: {},
        })
      state.landmarks = h.sample(now, this.interval)
      // Geometry gestures run at render rate on smoothed landmarks.
      classifyGeometry(
        state.landmarks,
        h.geo,
        h.gestures,
        this.aspect,
        h.pointingScore,
      )
      state.handedness = h.handedness
      state.gestures = h.gestures
    }
    this.faceStates.length = this.faces.length
    for (let i = 0; i < this.faces.length; i++) {
      const f = this.faces[i]!
      const state =
        this.faceStates[i] ??
        (this.faceStates[i] = { landmarks: [], blendshapes: {} })
      state.landmarks = f.sample(now, this.interval * 2)
      state.blendshapes = f.blendshapes
      state.transform = f.transform
    }
    s.hands = this.handStates
    s.faces = this.faceStates
    return s
  }

  /** Milliseconds since the last time any hand was visible. */
  handAge(now: number): number {
    let last = 0
    for (const h of this.hands) last = Math.max(last, h.lastSeen)
    return last ? now - last : Infinity
  }

  reset(): void {
    this.hands = []
    this.faces = []
    this.lastResultTs = 0
  }
}
