/**
 * Schema migrations. Each step upgrades data from version N-1 to N.
 * Pure over a small key/value adapter so it is unit-testable without IndexedDB.
 */
export const SCHEMA_VERSION = 1

export interface KvAdapter {
  keys(store: StoreName): Promise<string[]>
  get<T>(store: StoreName, key: string): Promise<T | undefined>
  set(store: StoreName, key: string, value: unknown): Promise<void>
}

export type StoreName = 'memes' | 'books' | 'pages' | 'settings' | 'meta'

type Step = (db: KvAdapter) => Promise<void>

/** steps[n] migrates from version n to n + 1. Version 0 = empty database. */
export const steps: Record<number, Step> = {
  // 0 -> 1: initial schema. Nothing to transform; marks the database.
  0: async () => undefined,
}

export async function migrate(
  db: KvAdapter,
  target = SCHEMA_VERSION,
  table: Record<number, Step> = steps,
): Promise<{ from: number; to: number }> {
  const from = (await db.get<number>('meta', 'schema')) ?? 0
  if (from > target) throw new Error('schema-from-future:' + from)
  for (let v = from; v < target; v++) {
    const step = table[v]
    if (!step) throw new Error('missing-migration:' + v)
    await step(db)
    await db.set('meta', 'schema', v + 1)
  }
  return { from, to: Math.max(from, target) }
}
