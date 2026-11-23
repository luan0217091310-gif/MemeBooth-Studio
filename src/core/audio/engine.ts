let context: AudioContext | undefined
export async function unlockAudio(): Promise<void> {
  if (typeof AudioContext === 'undefined') return
  context ??= new AudioContext()
  if (context.state === 'suspended') await context.resume()
}
