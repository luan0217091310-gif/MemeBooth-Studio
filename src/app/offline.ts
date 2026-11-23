import { useSession } from '@/store/session'

export async function prepareOffline() {
  const { setOffline } = useSession.getState()
  if (import.meta.env.DEV) return setOffline('dev')
  if (!('serviceWorker' in navigator)) return setOffline('unavailable')
  try {
    const registration = await navigator.serviceWorker.register('./sw.js')
    const update = () => {
      if (navigator.serviceWorker.controller) setOffline('ready')
      else if (registration.installing?.state === 'redundant')
        setOffline('unavailable')
    }
    const installing = registration.installing
    installing?.addEventListener('statechange', () => {
      if (
        installing.state === 'redundant' &&
        !navigator.serviceWorker.controller
      )
        setOffline('unavailable')
      else update()
    })
    navigator.serviceWorker.addEventListener('controllerchange', update)
    update()
  } catch {
    setOffline('unavailable')
  }
}
