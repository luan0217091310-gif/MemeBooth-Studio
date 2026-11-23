// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
it('ships both pinned models and the installed SDK runtime with matching hashes', async () => {
  const root = 'public/mediapipe'
  const manifest: {
    version: string
    files: { path: string; sha256: string }[]
  } = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
  const pkg = JSON.parse(
    await readFile('node_modules/@mediapipe/tasks-vision/package.json', 'utf8'),
  )
  expect(manifest.version).toBe(pkg.version)
  const paths = manifest.files.map((asset) => asset.path)
  expect(paths).toEqual(
    expect.arrayContaining([
      'models/gesture_recognizer.task',
      'models/face_landmarker.task',
    ]),
  )
  expect(paths.some((file) => file.endsWith('.wasm'))).toBe(true)
  for (const asset of manifest.files) {
    const data = await readFile(join(root, asset.path))
    expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256)
  }
})
