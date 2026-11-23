import { useFx } from '@/store/fx'
import { useStage } from '@/store/stage'
import { useUi } from '@/store/ui'
import { useVibe } from '@/store/vibe'
import { loadSettings, saveSettings, type AppSettings } from './repo'

let started = false

/**
 * Loads persisted settings into the stores once, then saves changes
 * (debounced) to the IndexedDB `settings` store.
 */
export async function startSettingsSync(
  onApply: (s: AppSettings) => void,
): Promise<void> {
  if (started) return
  started = true
  const s = await loadSettings()
  if (s.vibeId && s.vibeId !== useVibe.getState().vibeId)
    useVibe.getState().setVibe(s.vibeId)
  const fx: Parameters<ReturnType<typeof useFx.getState>['set']>[0] = {}
  if (s.micSensitivity !== undefined) fx.micSensitivity = s.micSensitivity
  if (s.reduceFlash !== undefined) fx.reduceFlash = s.reduceFlash
  if (s.reducedMotion !== undefined) fx.reducedMotion = s.reducedMotion
  useFx.getState().set(fx)
  if (s.onboarded && useUi.getState().coach >= 0) useUi.getState().setCoach(-1)
  onApply(s)

  let timer = 0
  const snapshot = (): AppSettings => ({
    vibeId: useVibe.getState().vibeId,
    mirror: useStage.getState().mirror,
    muted: useFx.getState().muted,
    micSensitivity: useFx.getState().micSensitivity,
    reduceFlash: useFx.getState().reduceFlash,
    reducedMotion: useFx.getState().reducedMotion,
    onboarded: useUi.getState().coach < 0,
  })
  let last = JSON.stringify(snapshot())
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      const next = snapshot()
      const json = JSON.stringify(next)
      if (json === last) return
      last = json
      void saveSettings(next).catch(() => undefined)
    }, 500)
  }
  useVibe.subscribe(schedule)
  useFx.subscribe(schedule)
  useStage.subscribe(schedule)
  useUi.subscribe(schedule)
}
