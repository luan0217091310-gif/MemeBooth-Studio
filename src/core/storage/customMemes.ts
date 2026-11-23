import { getBus } from '@/core/audio/engine'
import { registerBuffer } from '@/core/audio/soundRegistry'
import { evictMemeImage } from '@/core/canvas/fx'
import { useMemes } from '@/store/memes'
import { dropBlobUrl, setBlobUrl } from './blobUrls'
import {
  deleteCustomMeme,
  listCustomMemes,
  saveCustomMeme,
  type StoredMeme,
} from './repo'

/** Sound id used for a custom meme's uploaded / recorded audio. */
export const customSoundId = (memeId: string) => 'custom:' + memeId

async function registerAudio(id: string, blob: Blob): Promise<void> {
  const bus = getBus()
  if (!bus) return
  const buffer = await bus.ctx.decodeAudioData(await blob.arrayBuffer())
  registerBuffer(customSoundId(id), buffer)
}

/** Makes a stored meme usable everywhere immediately (no reload). */
export async function activate(meme: StoredMeme): Promise<void> {
  if (meme.image) setBlobUrl(meme.def.id, meme.image)
  evictMemeImage(meme.def.id)
  if (meme.sound)
    await registerAudio(meme.def.id, meme.sound).catch(() => undefined)
  useMemes.getState().register(meme.def)
}

export async function loadCustomMemes(): Promise<number> {
  const all = await listCustomMemes()
  for (const m of all) await activate(m)
  return all.length
}

export async function createCustomMeme(meme: StoredMeme): Promise<void> {
  await saveCustomMeme(meme)
  await activate(meme)
}

export async function removeCustomMeme(id: string): Promise<void> {
  await deleteCustomMeme(id)
  dropBlobUrl(id)
  evictMemeImage(id)
  useMemes.getState().unregister(id)
}
