import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { MemeDef } from '@/types'
import { createCustomMeme } from './customMemes'
import { listCustomMemes } from './repo'

interface PackManifest {
  format: 'memebooth-pack'
  version: 1
  memes: {
    def: MemeDef
    image?: string
    imageType?: string
    sound?: string
    soundType?: string
  }[]
}

/** Exports every custom meme (definition + image + audio) as one .zip file. */
export async function exportPack(): Promise<Blob> {
  const memes = await listCustomMemes()
  const files: Record<string, Uint8Array> = {}
  const manifest: PackManifest = {
    format: 'memebooth-pack',
    version: 1,
    memes: [],
  }
  for (const m of memes) {
    const entry: PackManifest['memes'][number] = { def: m.def }
    if (m.image) {
      entry.image = 'images/' + m.def.id
      entry.imageType = m.image.type
      files[entry.image] = new Uint8Array(await m.image.arrayBuffer())
    }
    if (m.sound) {
      entry.sound = 'sounds/' + m.def.id
      entry.soundType = m.sound.type
      files[entry.sound] = new Uint8Array(await m.sound.arrayBuffer())
    }
    manifest.memes.push(entry)
  }
  files['manifest.json'] = strToU8(JSON.stringify(manifest))
  const zipped = zipSync(files, { level: 0 })
  return new Blob([zipped as Uint8Array<ArrayBuffer>], {
    type: 'application/zip',
  })
}

/** Imports a pack; returns how many memes were added. Rejects invalid files. */
export async function importPack(file: Blob): Promise<number> {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const raw = files['manifest.json']
  if (!raw) throw new Error('no-manifest')
  const manifest = JSON.parse(strFromU8(raw)) as PackManifest
  if (manifest.format !== 'memebooth-pack' || !Array.isArray(manifest.memes))
    throw new Error('bad-format')
  let n = 0
  for (const m of manifest.memes) {
    if (!m.def?.id || m.def.source !== 'custom') continue
    const img = m.image ? files[m.image] : undefined
    const snd = m.sound ? files[m.sound] : undefined
    await createCustomMeme({
      def: m.def,
      image: img
        ? new Blob([img as Uint8Array<ArrayBuffer>], { type: m.imageType })
        : undefined,
      sound: snd
        ? new Blob([snd as Uint8Array<ArrayBuffer>], { type: m.soundType })
        : undefined,
    })
    n++
  }
  return n
}
