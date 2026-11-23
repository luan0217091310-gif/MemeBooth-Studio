import type { StageEngine } from '@/core/canvas/stageEngine'

// Lightweight handle to the active engine. Importing this module does not
// pull the engine code into the initial bundle (type-only import).
let active: StageEngine | null = null

export function getStageEngine(): StageEngine | null {
  return active
}

export function setStageEngine(engine: StageEngine | null): void {
  active = engine
}
