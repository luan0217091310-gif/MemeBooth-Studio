import type {
  Condition,
  EffectId,
  InteractionMode,
  PerceptionSnapshot,
  TriggerRule,
} from '@/types'

export const DEFAULT_HAND_MIN = 0.58
export const DEFAULT_DERIVED_MIN = 0.52
/** A single rule that is a subset of an accumulating combo waits this long. */
export const SUBSET_DEFER_MS = 280

export interface RuleState {
  /** When all conditions started being true together (hold), or -1. */
  heldSince: number
  lastFired: number
  /** Last time each condition was true (for windowMs rules). */
  lastTrue: number[]
  /** First time the current deferral started, or -1. */
  deferredSince: number
}

export interface ComboState {
  rules: Map<string, RuleState>
}

export interface Fired {
  ruleId: string
  effect: EffectId
  score: number
}

export interface Pending {
  ruleId: string
  progress: number
  score: number
}

export interface ComboResult {
  fired: Fired[]
  /** Highest-priority rule currently accumulating (for the HUD ring). */
  pending: Pending | null
  /** Smoothed match score per rule (0..1), for DebugPanel / challenge. */
  scores: Record<string, number>
}

export function createComboState(): ComboState {
  return { rules: new Map() }
}

/** Score of one condition (0..1, >= threshold means satisfied). */
export function conditionScore(
  c: Condition,
  s: PerceptionSnapshot,
): { score: number; ok: boolean } {
  switch (c.kind) {
    case 'hand': {
      const min = c.minScore ?? DEFAULT_HAND_MIN
      const vals = s.hands.map((h) => h.gestures[c.gesture] ?? 0)
      if (c.hands === 'both') {
        if (vals.length < 2) return { score: 0, ok: false }
        const sorted = [...vals].sort((a, b) => b - a)
        const v = sorted[1]!
        return { score: v, ok: v >= min }
      }
      const v = vals.length ? Math.max(...vals) : 0
      return { score: v, ok: v >= min }
    }
    case 'face': {
      const v = s.faces[0]?.blendshapes[c.blendshape] ?? 0
      const ok = c.op === '>' ? v > c.value : v < c.value
      return { score: ok ? 1 : c.op === '>' ? v / c.value : 0, ok }
    }
    case 'derived': {
      const v = s.derived[c.id] ?? 0
      return { score: v, ok: v >= (c.minScore ?? DEFAULT_DERIVED_MIN) }
    }
  }
}

const condKey = (c: Condition) =>
  c.kind === 'hand'
    ? 'h:' + c.gesture + ':' + (c.hands ?? 'any')
    : c.kind === 'face'
      ? 'f:' + c.blendshape + c.op + c.value
      : 'd:' + c.id

/** True when every condition of `a` appears in `b` and b is larger (a ⊂ b). */
export function isSubset(a: TriggerRule, b: TriggerRule): boolean {
  if (a.all.length >= b.all.length) return false
  const keys = new Set(b.all.map(condKey))
  return a.all.every((c) => keys.has(condKey(c)))
}

/** Rules allowed in a mode: draw mode only lets face expressions through. */
export function ruleAllowed(rule: TriggerRule, mode: InteractionMode): boolean {
  if (mode !== 'draw') return true
  return rule.all.every(
    (c) =>
      c.kind === 'face' || (c.kind === 'derived' && c.id !== 'HEART_TWO_HANDS'),
  )
}

/**
 * Pure-ish combo step: mutates only `state`, returns effects to play.
 * - hold: all conditions true continuously for holdMs
 * - window: each condition true at some point within the last windowMs
 * - cooldown per rule, priority, combos beat their subsets, subsets deferred
 */
export function stepCombo(
  state: ComboState,
  rules: readonly TriggerRule[],
  snapshot: PerceptionSnapshot,
  now: number,
  mode: InteractionMode = 'meme',
): ComboResult {
  const scores: Record<string, number> = {}
  const ready: { rule: TriggerRule; score: number }[] = []
  const accumulating: { rule: TriggerRule; progress: number; score: number }[] =
    []

  for (const rule of rules) {
    let rs = state.rules.get(rule.id)
    if (!rs) {
      rs = {
        heldSince: -1,
        lastFired: -Infinity,
        lastTrue: rule.all.map(() => -Infinity),
        deferredSince: -1,
      }
      state.rules.set(rule.id, rs)
    }
    const results = rule.all.map((c) => conditionScore(c, snapshot))
    let score = Math.min(...results.map((r) => r.score))
    results.forEach((r, i) => {
      if (r.ok) rs.lastTrue[i] = now
    })
    let satisfied: boolean
    if (rule.windowMs) {
      satisfied = rs.lastTrue.every((t) => now - t <= rule.windowMs!)
      if (satisfied) score = Math.max(score, 0.75)
    } else satisfied = results.every((r) => r.ok)
    scores[rule.id] = Math.max(0, Math.min(1, score))
    const allowed = ruleAllowed(rule, mode)
    if (!satisfied && rule.windowMs && allowed) {
      // Partially met window combo: counts as building so subsets wait.
      const met = rs.lastTrue.filter((t) => now - t <= rule.windowMs!).length
      if (met > 0)
        accumulating.push({ rule, progress: met / rule.all.length, score })
    }
    if (!satisfied || !allowed) {
      rs.heldSince = -1
      rs.deferredSince = -1
      continue
    }
    if (rs.heldSince < 0) rs.heldSince = now
    if (now - rs.lastFired < rule.cooldownMs) continue
    const held = now - rs.heldSince
    if (held >= rule.holdMs) ready.push({ rule, score })
    else
      accumulating.push({
        rule,
        progress: held / Math.max(1, rule.holdMs),
        score,
      })
  }

  const fired: Fired[] = []
  // Highest priority first; combos (more conditions) win ties.
  const order = (x: { rule: TriggerRule }, y: { rule: TriggerRule }) =>
    y.rule.priority - x.rule.priority || y.rule.all.length - x.rule.all.length
  ready.sort(order)
  const firedRules: TriggerRule[] = []
  for (const { rule, score } of ready) {
    const rs = state.rules.get(rule.id)!
    // Skip a single rule that is a subset of a combo that fires or is building.
    const supersetFires = firedRules.some((f) => isSubset(rule, f))
    if (supersetFires) {
      rs.lastFired = now
      continue
    }
    const supersetBuilding = accumulating.some((a) => isSubset(rule, a.rule))
    if (supersetBuilding) {
      if (rs.deferredSince < 0) rs.deferredSince = now
      if (now - rs.deferredSince < SUBSET_DEFER_MS) continue
    }
    rs.lastFired = now
    rs.heldSince = -1
    rs.deferredSince = -1
    firedRules.push(rule)
    fired.push({ ruleId: rule.id, effect: rule.effect, score })
    // The combo consumes its subsets: they start their cooldown too, so the
    // single meme does not pop right after the combo.
    for (const other of rules) {
      if (!isSubset(other, rule)) continue
      const os = state.rules.get(other.id)
      if (os) {
        os.lastFired = now
        os.heldSince = -1
      }
    }
  }
  accumulating.sort(order)
  const top = accumulating[0]
  return {
    fired,
    pending: top
      ? { ruleId: top.rule.id, progress: top.progress, score: top.score }
      : null,
    scores,
  }
}
