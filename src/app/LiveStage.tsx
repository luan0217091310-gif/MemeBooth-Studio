import { lazy, Suspense, useEffect } from 'react'
import { Toast } from '@/components/common/Toast'
import { ShareModal } from '@/components/common/ShareModal'
import { ChallengeHud } from '@/components/challenge/ChallengeHud'
import { QuickBar } from '@/components/controls/CreativeToolbar'
import { FloatingDock } from '@/components/controls/FloatingDock'
import { SideDrawer } from '@/components/controls/SideDrawer'
import { CameraStage } from '@/components/stage/CameraStage'
import {
  CaptureReview,
  CountdownOverlay,
  RecordingBadge,
} from '@/components/stage/CaptureOverlays'
import { CoachMarks, StageHints } from '@/components/stage/CoachMarks'
import { GesturePills } from '@/components/stage/GesturePills'
import { getStageEngine } from '@/core/engineRef'
import { loadCustomMemes } from '@/core/storage/customMemes'
import { unlockAudio } from '@/core/audio/engine'
import { useCapture } from '@/store/capture'
import { useUi } from '@/store/ui'
import { vi } from '@/i18n/vi'

// Photo Book (react-pageflip) is its own chunk, loaded on demand.
const PhotoBookView = lazy(() => import('@/components/photobook/PhotoBookView'))

/**
 * Everything that exists only after "Bắt đầu": camera stage, tools, capture,
 * challenge, share and Photo Book. Loaded as a separate chunk so the home
 * screen stays light (Lighthouse).
 */
export default function LiveStage() {
  const bookOpen = useUi((s) => s.bookOpen)

  useEffect(() => {
    // Custom meme sounds need the AudioContext (already unlocked by Start).
    void unlockAudio()
      .then(() => loadCustomMemes())
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    getStageEngine()?.setVisionPaused(bookOpen)
  }, [bookOpen])

  useEffect(() => {
    // Capture shortcuts: Space photo, R video, Esc cancel / close review.
    const handle = (event: KeyboardEvent) => {
      const cap = getStageEngine()?.capture
      if (!cap) return
      const phase = useCapture.getState().phase
      if (event.key === 'Escape') {
        if (phase === 'photo' || phase === 'recording') {
          event.stopImmediatePropagation()
          cap.cancel()
        } else if (phase === 'review' || phase === 'videoReview') {
          event.stopImmediatePropagation()
          cap.closeReview()
        }
        return
      }
      const t = event.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)
        return
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      // Space on a focused button must still press that button.
      const onButton = t instanceof HTMLElement && !!t.closest('button')
      if (event.key === ' ' && !onButton) {
        event.preventDefault()
        if (phase === 'idle') void cap.startPhoto()
      } else if (event.key.toLowerCase() === 'r') {
        if (phase === 'recording') void cap.stopVideo()
        else if (phase === 'idle') cap.startVideo()
      }
    }
    // Capture phase so Esc reaches us before the app-level handler.
    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [])

  return (
    <section className="stage live" aria-label={vi.stage}>
      <CameraStage />
      <QuickBar />
      <SideDrawer />
      <StageHints />
      <GesturePills />
      <FloatingDock />
      <CoachMarks />
      <CountdownOverlay />
      <RecordingBadge />
      <CaptureReview />
      <ChallengeHud />
      <ShareModal />
      {bookOpen && (
        <Suspense fallback={<p className="stage-note">{vi.album.loading}</p>}>
          <PhotoBookView onClose={() => useUi.getState().setBookOpen(false)} />
        </Suspense>
      )}
      <Toast />
    </section>
  )
}
