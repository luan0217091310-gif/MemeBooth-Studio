import { useEffect, useState } from 'react'
import { Hand, RotateCcw, Share2, Trophy, X } from 'lucide-react'
import { getStageEngine } from '@/components/stage/CameraStage'
import { challengeConfig } from '@/config/challenges'
import { captureFilename } from '@/core/capture/filename'
import { blobUrl } from '@/core/storage/blobUrls'
import { useChallenge } from '@/store/challenge'
import { useShare } from '@/store/share'
import { useUi } from '@/store/ui'
import { triggerEmoji, triggerLabel } from '@/i18n/gestures'
import { vi } from '@/i18n/vi'
import type { MemeDef } from '@/types'

const ctl = () => getStageEngine()?.challengeCtl

function memeArt(m: MemeDef): string | undefined {
  if (m.visual.kind === 'svg')
    return (
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.visual.svg)
    )
  return blobUrl(m.visual.blobKey)
}

function Intro() {
  const difficulty = useChallenge((s) => s.difficulty)
  const best = useChallenge((s) => s.best)
  const set = useChallenge((s) => s.set)
  return (
    <div
      className="review"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch-title"
    >
      <div className="review-card challenge-card">
        <header>
          <h2 id="ch-title">
            <Trophy size={20} /> {vi.challenge.title}
          </h2>
          <button
            className="round"
            aria-label={vi.close}
            onClick={() => ctl()?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <p>
          {vi.challenge.intro
            .replace('{n}', String(challengeConfig.turns))
            .replace('{s}', String(challengeConfig.turnSeconds))}
        </p>
        <div
          className="segmented"
          role="radiogroup"
          aria-label={vi.challenge.difficulty}
        >
          {(['easy', 'hard'] as const).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={difficulty === d}
              className={difficulty === d ? 'on' : ''}
              data-dwell
              onClick={() => set({ difficulty: d })}
            >
              {d === 'easy' ? vi.challenge.easy : vi.challenge.hard}
            </button>
          ))}
        </div>
        {best > 0 && (
          <p className="panel-note">
            {vi.challenge.best}: {best}
          </p>
        )}
        {ctl()?.manualMode && (
          <p className="panel-note">{vi.challenge.manualNote}</p>
        )}
        <div className="card-actions">
          <button
            className="primary"
            data-dwell
            onClick={() => void ctl()?.start(difficulty)}
          >
            {vi.challenge.start}
          </button>
        </div>
      </div>
    </div>
  )
}

function Turn() {
  const { prompts, index, turnStartedAt, live, results, total, phase } =
    useChallenge()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [])
  const prompt = prompts[index]
  if (!prompt) return null
  const turnMs = challengeConfig.turnSeconds * 1000
  const left = Math.max(0, turnMs - (performance.now() - turnStartedAt))
  const last = results[results.length - 1]
  const art = memeArt(prompt)
  return (
    <>
      <div className="challenge-card-prompt" role="status" aria-live="polite">
        <span className="ch-round">
          {vi.challenge.turn} {index + 1}/{prompts.length} · {total}{' '}
          {vi.challenge.points}
        </span>
        {art && <img src={art} alt="" />}
        <b>{prompt.name}</b>
        <span className="ch-trigger">
          <span aria-hidden className="ch-emoji">
            {triggerEmoji(prompt.trigger)}
          </span>
          {triggerLabel(prompt.trigger)}
        </span>
        {phase === 'turn' && (
          <>
            <div className="ch-time" aria-label={vi.challenge.timeLeft}>
              <i style={{ width: (left / turnMs) * 100 + '%' }} />
            </div>
            <div className="ch-match" aria-label={vi.challenge.match}>
              <i style={{ width: Math.round(live * 100) + '%' }} />
            </div>
            {ctl()?.manualMode && (
              <button
                className="primary"
                data-dwell
                onClick={() => ctl()?.confirmManually()}
              >
                <Hand size={18} /> {vi.challenge.manualDone}
              </button>
            )}
          </>
        )}
        {phase === 'between' && last && (
          <p className={'ch-result ' + (last.hit ? 'hit' : 'miss')}>
            {last.hit
              ? '+' +
                last.points +
                (last.streak > 1
                  ? ' · ' + vi.challenge.streak + ' x' + last.streak
                  : '')
              : vi.challenge.miss}
          </p>
        )}
      </div>
      <div className="dock" role="toolbar" aria-label={vi.dock.label}>
        <button
          className="dock-btn danger"
          data-dwell
          onClick={() => ctl()?.close()}
        >
          <X size={24} />
          <span>{vi.challenge.quit}</span>
        </button>
      </div>
    </>
  )
}

function Scoreboard() {
  const { results, prompts, total, best, stripUrl, strip, difficulty } =
    useChallenge()
  return (
    <div
      className="review"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-title"
    >
      <div className="review-card challenge-card">
        <header>
          <h2 id="sb-title">
            <Trophy size={20} /> {vi.challenge.scoreboard}
          </h2>
          <button
            className="round"
            aria-label={vi.close}
            onClick={() => ctl()?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <div className="review-body">
          <table className="score-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{vi.challenge.prompt}</th>
                <th>{vi.challenge.match}</th>
                <th>{vi.challenge.points}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={r.hit ? 'hit' : 'miss'}>
                  <td>{i + 1}</td>
                  <td>{prompts[i]?.name}</td>
                  <td>{r.hit ? Math.round(r.match * 100) + '%' : '—'}</td>
                  <td>{r.points}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>{vi.challenge.total}</td>
                <td>
                  <b>{total}</b>
                </td>
              </tr>
            </tfoot>
          </table>
          {stripUrl && (
            <img
              className="score-strip"
              src={stripUrl}
              alt={vi.challenge.stripAlt}
            />
          )}
        </div>
        <p className="panel-note">
          {total >= best && total > 0
            ? vi.challenge.newBest
            : vi.challenge.best + ': ' + best}
          {strip ? ' · ' + vi.challenge.savedToAlbum : ''}
        </p>
        <div className="card-actions">
          <button
            className="primary"
            data-dwell
            onClick={() => {
              ctl()?.close()
              useChallenge.getState().set({ phase: 'intro' })
              void ctl()?.start(difficulty)
            }}
          >
            <RotateCcw size={18} /> {vi.challenge.again}
          </button>
          {strip && (
            <button
              className="ghost"
              onClick={() =>
                useShare.getState().open(strip, captureFilename('png'))
              }
            >
              <Share2 size={18} /> {vi.share.title}
            </button>
          )}
          {strip && (
            <button
              className="ghost"
              onClick={() => useUi.getState().setBookOpen(true)}
            >
              {vi.album.open}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChallengeHud() {
  const phase = useChallenge((s) => s.phase)
  if (phase === 'intro') return <Intro />
  if (phase === 'turn' || phase === 'between') return <Turn />
  if (phase === 'scoreboard') return <Scoreboard />
  return null
}
