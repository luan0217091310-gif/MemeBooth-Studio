import { useEffect, useRef } from 'react'
import { useFx } from '@/store/fx'
import { useCapture } from '@/store/capture'
import { useScene } from '@/store/scene'
import { useUi } from '@/store/ui'
import { useVibe } from '@/store/vibe'
import { vi } from '@/i18n/vi'

/**
 * First-run coach marks: try a meme gesture, try Vibe/AR/stickers, try capturing.
 * Each step advances automatically when the user does it; always skippable.
 */
export function CoachMarks() {
  const step = useUi((s) => s.coach)
  const setCoach = useUi((s) => s.setCoach)
  const strokes = useScene((s) => s.strokes.length + s.items.length)
  const propsCount = useFx((s) => s.activeProps.length)
  const vibeId = useVibe((s) => s.vibeId)
  const lastMeme = useFx((s) => s.lastMeme)
  const captured = useCapture((s) => s.phase === 'review')
  const baseline = useRef({ strokes, propsCount, vibeId, lastMeme })

  useEffect(() => {
    if (step === 0 && lastMeme && lastMeme !== baseline.current.lastMeme)
      setCoach(1)
  }, [step, lastMeme, setCoach])

  useEffect(() => {
    if (
      step === 1 &&
      (vibeId !== baseline.current.vibeId ||
        propsCount > baseline.current.propsCount ||
        strokes > baseline.current.strokes)
    )
      setCoach(2)
  }, [step, vibeId, propsCount, strokes, setCoach])

  useEffect(() => {
    if (step === 2 && captured) setCoach(-1)
  }, [step, captured, setCoach])

  if (step < 0) return null
  const s = vi.coach.steps[step]!
  return (
    <div
      className={'coach coach-' + step}
      role="dialog"
      aria-live="polite"
      aria-labelledby="coach-title"
    >
      <span className="coach-step">
        {step + 1}/{vi.coach.steps.length}
      </span>
      <h2 id="coach-title">{s.title}</h2>
      <p>{s.body}</p>
      <div className="card-actions">
        {step === vi.coach.steps.length - 1 ? (
          <button className="primary" onClick={() => setCoach(-1)}>
            {vi.coach.done}
          </button>
        ) : (
          <button className="ghost" onClick={() => setCoach(step + 1)}>
            {vi.coach.next}
          </button>
        )}
        <button className="link" onClick={() => setCoach(-1)}>
          {vi.coach.skip}
        </button>
      </div>
    </div>
  )
}

/** Contextual hints: low light, "put your hand in frame". */
export function StageHints() {
  const hint = useUi((s) => s.hint)
  if (!hint) return null
  return (
    <p className="stage-hint" role="status">
      {hint === 'lowLight' ? vi.hints.lowLight : vi.hints.showHand}
    </p>
  )
}
