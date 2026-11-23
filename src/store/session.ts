import { create } from 'zustand'
export type OfflineStatus = 'waiting' | 'ready' | 'unavailable' | 'dev'
interface Session {
  started: boolean
  debug: boolean
  offline: OfflineStatus
  setStarted(started: boolean): void
  setDebug(debug: boolean): void
  setOffline(offline: OfflineStatus): void
}
export const useSession = create<Session>((set) => ({
  started: false,
  debug: false,
  offline: 'waiting',
  setStarted: (started) => set({ started }),
  setDebug: (debug) => set({ debug }),
  setOffline: (offline) => set({ offline }),
}))
