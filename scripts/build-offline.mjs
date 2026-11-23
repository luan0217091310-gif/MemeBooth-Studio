import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = 'dist'
const manifest = JSON.parse(
  await readFile(path.join(base, 'mediapipe/manifest.json'), 'utf8'),
)
for (const asset of manifest.files) {
  const bytes = await readFile(path.join(base, 'mediapipe', asset.path))
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
    throw new Error('Corrupt build asset: ' + asset.path)
}
const files = (await readdir(base, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) =>
    path
      .relative(base, path.join(entry.parentPath, entry.name))
      .split(path.sep)
      .join('/'),
  )
  .filter((file) => file !== 'sw.js')
  .sort()
const source = await readFile('scripts/sw-template.js', 'utf8')
const hash = createHash('sha256').update(source)
for (const file of files)
  hash.update(file).update(await readFile(path.join(base, file)))
const version = hash.digest('hex').slice(0, 16)
await writeFile(
  path.join(base, 'sw.js'),
  source
    .replace(/['"]__FILES__['"]/, JSON.stringify(files))
    .replace('__VERSION__', version),
)
console.log('Offline cache: ' + files.length + ' files, revision ' + version)
