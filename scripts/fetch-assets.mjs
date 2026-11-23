import { createHash, randomUUID } from 'node:crypto'
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
  readdir,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public', 'mediapipe')
const sdk = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision')
const models = {
  gesture_recognizer:
    '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482',
  face_landmarker:
    '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',
}
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex')
async function publish(file, data) {
  const temp = file + '.' + randomUUID() + '.tmp'
  try {
    await writeFile(temp, data)
    await rename(temp, file)
  } finally {
    await rm(temp, { force: true })
  }
}
async function matches(file, hash) {
  try {
    return digest(await readFile(file)) === hash
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}
await Promise.all(
  ['models', 'wasm'].map((dir) =>
    mkdir(path.join(output, dir), { recursive: true }),
  ),
)
const files = []
for (const [name, sha256] of Object.entries(models)) {
  const relative = 'models/' + name + '.task'
  const file = path.join(output, relative)
  if (!(await matches(file, sha256))) {
    const url =
      'https://storage.googleapis.com/mediapipe-models/' +
      name +
      '/' +
      name +
      '/float16/1/' +
      name +
      '.task'
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
    if (!response.ok) throw new Error(name + ': HTTP ' + response.status)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (digest(bytes) !== sha256) throw new Error('Invalid SHA-256: ' + name)
    await publish(file, bytes)
  }
  files.push({ path: relative, sha256, modelVersion: 1 })
}
const wasm = await readdir(path.join(sdk, 'wasm'))
if (
  !wasm.some((name) => name.endsWith('.wasm')) ||
  !wasm.some((name) => name.endsWith('.js'))
)
  throw new Error('Missing MediaPipe runtime')
for (const name of wasm.filter((name) => /\.(js|wasm)$/.test(name)).sort()) {
  const bytes = await readFile(path.join(sdk, 'wasm', name))
  const sha256 = digest(bytes)
  const relative = 'wasm/' + name
  if (!(await matches(path.join(output, relative), sha256)))
    await publish(path.join(output, relative), bytes)
  files.push({ path: relative, sha256 })
}
const { version } = JSON.parse(
  await readFile(path.join(sdk, 'package.json'), 'utf8'),
)
await publish(
  path.join(output, 'manifest.json'),
  JSON.stringify({ version, files }, null, 2) + '\n',
)
console.log(
  'MediaPipe ' + version + ': ' + files.length + ' verified local assets.',
)
