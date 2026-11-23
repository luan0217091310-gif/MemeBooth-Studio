/// <reference lib="webworker" />
import { VisionCore, VisionError } from './visionCore'
import type { FromWorker, ToWorker } from './protocol'

const scope = self as unknown as DedicatedWorkerGlobalScope
const core = new VisionCore()
const post = (message: FromWorker, transfer: Transferable[] = []) =>
  scope.postMessage(message, transfer)

scope.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data
  switch (msg.type) {
    case 'init':
      try {
        const delegate = await core.init(
          msg.config,
          msg.delegate,
          msg.origin,
          (percent) => post({ type: 'progress', percent }),
        )
        post({ type: 'ready', delegate })
      } catch (e) {
        const code = e instanceof VisionError ? e.code : 'model-init'
        post({ type: 'error', code, message: String(e) })
      }
      break
    case 'frame':
      try {
        const result = core.process(msg.bitmap, msg.ts)
        const transfer: Transferable[] = []
        result.hands?.forEach((h) => transfer.push(h.landmarks.buffer))
        result.faces?.forEach((f) => transfer.push(f.landmarks.buffer))
        post({ type: 'result', result }, transfer)
      } catch (e) {
        post({ type: 'error', code: 'inference', message: String(e) })
      } finally {
        msg.bitmap.close()
      }
      break
    case 'setOptions':
      if (msg.runBoth !== undefined) core.runBoth = msg.runBoth
      if (msg.numFaces !== undefined) await core.setNumFaces(msg.numFaces)
      break
    case 'dispose':
      core.dispose()
      scope.close()
      break
  }
}
