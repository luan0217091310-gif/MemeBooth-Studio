import { describe, expect, it } from 'vitest'
import {
  migrate,
  type KvAdapter,
  type StoreName,
} from '@/core/storage/migrations'
import {
  buildCustomMeme,
  checkAudio,
  checkImage,
  findDuplicates,
  fitSize,
  triggerOptions,
} from '@/core/storage/memeFactory'
import { builtinMemes } from '@/config/memes'
import { reelDuration, segmentAt } from '@/core/capture/highlightReel'

function memoryDb(): KvAdapter & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  const k = (s: StoreName, key: string) => s + '/' + key
  return {
    data,
    keys: async (s) => [...data.keys()].filter((x) => x.startsWith(s + '/')),
    get: async <T>(s: StoreName, key: string) =>
      data.get(k(s, key)) as T | undefined,
    set: async (s, key, v) => void data.set(k(s, key), v),
  }
}

describe('migrations', () => {
  it('upgrades an empty database to the current schema', async () => {
    const db = memoryDb()
    expect(await migrate(db)).toEqual({ from: 0, to: 1 })
    expect(db.data.get('meta/schema')).toBe(1)
    // Idempotent.
    expect(await migrate(db)).toEqual({ from: 1, to: 1 })
  })
  it('runs every step in order and records each version', async () => {
    const db = memoryDb()
    const order: number[] = []
    const table = {
      0: async () => void order.push(0),
      1: async (d: KvAdapter) => {
        order.push(1)
        await d.set('settings', 'app', { migrated: true })
      },
    }
    await migrate(db, 2, table)
    expect(order).toEqual([0, 1])
    expect(db.data.get('meta/schema')).toBe(2)
    expect(db.data.get('settings/app')).toEqual({ migrated: true })
  })
  it('refuses data from a newer app version and missing steps', async () => {
    const db = memoryDb()
    await db.set('meta', 'schema', 9)
    await expect(migrate(db, 1)).rejects.toThrow('schema-from-future')
    await expect(
      migrate(memoryDb(), 3, { 0: async () => undefined }),
    ).rejects.toThrow('missing-migration')
  })
})

describe('meme creator rules', () => {
  it('validates image type/size and audio size/duration', () => {
    expect(checkImage('image/webp', 1000)).toBe('ok')
    expect(checkImage('image/gif', 1000)).toBe('type')
    expect(checkImage('image/png', 6 * 1024 * 1024)).toBe('size')
    expect(checkAudio(500_000, 3)).toBe('ok')
    expect(checkAudio(2_000_000, 3)).toBe('size')
    expect(checkAudio(500_000, 6)).toBe('duration')
  })
  it('resizes to a 1024 px long edge without upscaling', () => {
    expect(fitSize(4000, 3000)).toEqual({ w: 1024, h: 768 })
    expect(fitSize(300, 200)).toEqual({ w: 300, h: 200 })
  })
  it('warns about triggers already used by built-in memes', () => {
    const rules = builtinMemes.map((m) => m.trigger)
    const thumb = triggerOptions.find((o) => o.id === 'hand:THUMB_UP')!
    expect(findDuplicates(rules, thumb.conditions).map((r) => r.id)).toEqual([
      'top-roof',
    ])
    const combo = triggerOptions.find((o) => o.id === 'combo:SMILE+THUMB_UP')!
    expect(findDuplicates(rules, combo.conditions)).toEqual([])
  })
  it('builds a custom meme whose rule id matches the meme id', () => {
    const m = buildCustomMeme({
      id: 'custom-x',
      name: ' ',
      top: 'trên',
      bottom: '',
      option: triggerOptions[0]!,
      priority: 80,
      soundId: 'pop',
      includeInChallenge: true,
    })
    expect(m.source).toBe('custom')
    expect(m.trigger.id).toBe('custom-x')
    expect(m.trigger.priority).toBe(80)
    expect(m.visual).toEqual({ kind: 'image', blobKey: 'custom-x' })
    expect(m.name).toBe('Meme của tôi')
    expect(m.caption).toEqual({ top: 'trên', bottom: undefined })
  })
})

describe('highlight reel timeline', () => {
  it('lasts 12-15 s for 4 moments', () => {
    const d = reelDuration(4)
    expect(d).toBeGreaterThanOrEqual(12)
    expect(d).toBeLessThanOrEqual(15)
  })
  it('maps time to title, clips and outro', () => {
    expect(segmentAt(0.5, 4)).toEqual({ kind: 'title', local: 0.5 })
    expect(segmentAt(1.5 + 2.5 * 2 + 0.1, 4)).toMatchObject({
      kind: 'clip',
      index: 2,
    })
    expect(segmentAt(reelDuration(4) - 0.5, 4).kind).toBe('outro')
  })
})
