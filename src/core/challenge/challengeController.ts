import { challengeConfig, type Difficulty } from '@/config/challenges'
import { browserMime, Recorder } from '@/core/audio/recorder'
import { playSound } from '@/core/audio/soundRegistry'
import type { StageEngine } from '@/core/canvas/stageEngine'
import { canvasToBlob } from '@/core/capture/filename'
import { composeLayout, layouts } from '@/core/capture/layouts'
import { vi } from '@/i18n/vi'
import { useAlbum } from '@/store/album'
import { saveBest, useChallenge } from '@/store/challenge'
import { useMemes } from '@/store/memes'
import { useScene } from '@/store/scene'
import { useStage } from '@/store/stage'
import { useUi } from '@/store/ui'
import { useVibe } from '@/store/vibe'
import type { InteractionMode, MemeDef } from '@/types'
import { pickPrompts, scoreTurn, totalScore, type TurnResult } from './game'

class Stopped extends Error {}

interface Hit {
  match: number
}

/**
 * Pose Challenge game loop. Each turn locks the combo engine to the prompt's
 * rule only, records a live clip, and on a match fires the meme, snaps a
 * still and scores it. The round ends with a scoreboard and a challenge
 * strip saved to the album.
 */
export class ChallengeController {
  private abort: AbortController | null = null
  private pendingHit: ((h: Hit) => void) | null = null
  private prevMode: InteractionMode = 'draw'

  constructor(private engine: StageEngine) {}

  get running(): boolean {
    const p = useChallenge.getState().phase
    return p === 'turn' || p === 'between'
  }

  /** No camera / no AI: the player confirms the pose by hand. */
  get manualMode(): boolean {
    return useStage.getState().vision !== 'ready'
  }

  open(): void {
    if (useChallenge.getState().phase === 'idle')
      useChallenge.getState().set({ phase: 'intro' })
  }

  close(): void {
    this.stop()
    const { stripUrl } = useChallenge.getState()
    if (stripUrl) URL.revokeObjectURL(stripUrl)
    useChallenge.getState().set({ phase: 'idle', stripUrl: null, strip: null })
  }

  stop(): void {
    this.abort?.abort()
    this.engine.challenge = null
  }

  /** Manual confirmation (mouse mode). */
  confirmManually(): void {
    this.pendingHit?.({ match: 0.6 })
  }

  async start(difficulty: Difficulty): Promise<void> {
    const prompts = pickPrompts(useMemes.getState().memes, difficulty)
    if (!prompts.length) {
      useUi.getState().showToast({ text: vi.challenge.noPrompts, ttl: 5000 })
      return
    }
    this.prevMode = useScene.getState().mode
    useScene.getState().setMode('challenge')
    const abort = new AbortController()
    this.abort = abort
    const results: TurnResult[] = []
    const shots: HTMLCanvasElement[] = []
    useChallenge
      .getState()
      .set({ difficulty, prompts, results: [], total: 0, index: 0 })
    let streak = 0
    try {
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]!
        const r = await this.turn(prompt, i, streak, abort.signal)
        streak = r.result.streak
        results.push(r.result)
        if (r.shot) shots.push(r.shot)
        useChallenge.getState().set({
          results: [...results],
          total: totalScore(results),
          phase: 'between',
        })
        await this.sleep(challengeConfig.betweenMs, abort.signal)
      }
      await this.finish(results, shots)
    } catch (e) {
      if (!(e instanceof Stopped))
        useUi.getState().showToast({ text: vi.capture.failed, ttl: 4000 })
      useChallenge.getState().set({ phase: 'intro' })
    } finally {
      this.engine.challenge = null
      this.engine.stopStream()
      useScene.getState().setMode(this.prevMode)
      this.abort = null
    }
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Stopped())
      const id = setTimeout(resolve, ms)
      signal.addEventListener(
        'abort',
        () => (clearTimeout(id), reject(new Stopped())),
        { once: true },
      )
    })
  }

  private async turn(
    prompt: MemeDef,
    index: number,
    streak: number,
    signal: AbortSignal,
  ): Promise<{ result: TurnResult; shot: HTMLCanvasElement | null }> {
    const turnMs = challengeConfig.turnSeconds * 1000
    const startedAt = performance.now()
    useChallenge
      .getState()
      .set({ phase: 'turn', index, turnStartedAt: startedAt, live: 0 })
    playSound('beep', { pitch: 1.3 })
    // Live clip for the moment (if the browser can record).
    const mime = browserMime()
    let rec: Recorder | null = null
    const stream = mime ? this.engine.startStream(640) : null
    if (mime && stream) {
      rec = new Recorder(mime)
      rec.start(stream, 1_500_000)
    }
    let best = 0
    const sampler = window.setInterval(() => {
      const v = this.engine.lastScores[prompt.trigger.id] ?? 0
      best = Math.max(best, v)
      useChallenge.getState().set({ live: v })
    }, 100)
    const hit = await new Promise<Hit | null>((resolve, reject) => {
      const timer = setTimeout(() => resolve(null), turnMs)
      const done = (h: Hit | null) => {
        clearTimeout(timer)
        this.pendingHit = null
        this.engine.challenge = null
        resolve(h)
      }
      this.pendingHit = (h) => {
        // Manual confirmation still fires the meme for the full experience.
        this.engine.triggerMeme(prompt.id)
        done(h)
      }
      // Only the prompt's rule can fire during the turn.
      this.engine.challenge = {
        rules: [prompt.trigger],
        onHit: (score) => done({ match: score }),
      }
      signal.addEventListener(
        'abort',
        () => (clearTimeout(timer), reject(new Stopped())),
        { once: true },
      )
    }).finally(() => window.clearInterval(sampler))
    const elapsed = performance.now() - startedAt
    let shot: HTMLCanvasElement | null = null
    if (hit) {
      const c = this.engine.captureStill()
      shot = document.createElement('canvas')
      shot.width = c.width
      shot.height = c.height
      shot.getContext('2d')!.drawImage(c, 0, 0)
      this.engine.fx.flash(performance.now())
      playSound('shutter')
    } else playSound('slideDown', { gain: 0.6 })
    if (rec) {
      if (hit) await this.sleep(500, signal).catch(() => undefined)
      const res = await rec.stop().catch(() => null)
      this.engine.stopStream()
      // Successful moments become album pages with their live clip.
      if (hit && res && shot) {
        const s = shot
        // Saves are queued so the first one creates the book, later ones append.
        this.saves = this.saves
          .then(() => this.savePage(s, res.blob, prompt))
          .catch(() => undefined)
      }
    }
    const scored = scoreTurn(
      !!hit,
      hit ? Math.max(hit.match, best) : best,
      elapsed,
      streak,
    )
    return {
      result: {
        memeId: prompt.id,
        hit: !!hit,
        match: hit ? hit.match : best,
        elapsedMs: elapsed,
        ...scored,
      },
      shot,
    }
  }

  private challengeBookId: string | null = null
  private saves: Promise<void> = Promise.resolve()

  private async savePage(
    shot: HTMLCanvasElement,
    clip: Blob,
    prompt: MemeDef,
  ): Promise<void> {
    const photo = await canvasToBlob(shot, 'image/jpeg', 0.9)
    const album = useAlbum.getState()
    const prev = album.currentBookId
    if (this.challengeBookId) album.setCurrent(this.challengeBookId)
    this.challengeBookId = await album.save(
      {
        kind: 'photo',
        photo,
        liveClip: clip,
        poster: photo,
        soundIds: [prompt.soundId],
        memeIds: [prompt.id],
        caption: vi.challenge.title + ': ' + prompt.name,
        layout: 'single',
      },
      useVibe.getState().vibeId,
      !this.challengeBookId,
    )
    if (prev) album.setCurrent(prev)
  }

  private async finish(
    results: TurnResult[],
    shots: HTMLCanvasElement[],
  ): Promise<void> {
    await this.saves
    const total = totalScore(results)
    const best = Math.max(total, useChallenge.getState().best)
    saveBest(best)
    let strip: Blob | null = null
    if (shots.length) {
      const composed = composeLayout(
        layouts.strip,
        shots.slice(0, 4),
        useVibe.getState().preset.photoFrame,
      )
      strip = await canvasToBlob(composed, 'image/png')
      // The challenge strip is saved to the album as well.
      if (this.challengeBookId)
        useAlbum.getState().setCurrent(this.challengeBookId)
      await useAlbum
        .getState()
        .save(
          {
            kind: 'photo',
            photo: strip,
            soundIds: [],
            memeIds: results.filter((r) => r.hit).map((r) => r.memeId),
            caption: vi.challenge.stripCaption.replace('{n}', String(total)),
            layout: 'strip',
          },
          useVibe.getState().vibeId,
          !this.challengeBookId,
        )
        .catch(() => undefined)
    }
    this.challengeBookId = null
    playSound('fanfare')
    useChallenge.getState().set({
      phase: 'scoreboard',
      total,
      best,
      strip,
      stripUrl: strip ? URL.createObjectURL(strip) : null,
    })
  }
}
