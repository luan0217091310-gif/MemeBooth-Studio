import type { Stroke, StrokePoint, Vec2 } from '@/types'

let splitCounter = 0

/**
 * Vector eraser: removes points inside the circle and splits strokes into
 * the surviving runs. Distances use `aspect` (srcH/srcW) so the circle is
 * round on screen. Returns the same array instance when nothing changed.
 */
export function eraseStrokes(
  strokes: readonly Stroke[],
  center: Vec2,
  radius: number,
  aspect = 1,
): readonly Stroke[] {
  const r2 = radius * radius
  const inside = (p: StrokePoint) => {
    const dx = p[0] - center.x
    const dy = (p[1] - center.y) * aspect
    return dx * dx + dy * dy <= r2
  }
  let changed = false
  const out: Stroke[] = []
  for (const s of strokes) {
    if (!s.points.some(inside)) {
      out.push(s)
      continue
    }
    changed = true
    let run: StrokePoint[] = []
    const flush = () => {
      if (run.length > 0)
        out.push({
          ...s,
          id: s.id + '~' + (++splitCounter).toString(36),
          points: run,
        })
      run = []
    }
    for (const p of s.points) {
      if (inside(p)) flush()
      else run.push(p)
    }
    flush()
  }
  return changed ? out : strokes
}
