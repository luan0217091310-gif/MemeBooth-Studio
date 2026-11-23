import { useEffect, useRef, useState } from 'react'
import { Download, Mic, Play, Trash2, Upload } from 'lucide-react'
import { getBus } from '@/core/audio/engine'
import { playSound } from '@/core/audio/soundRegistry'
import { textFont } from '@/core/canvas/items'
import {
  createCustomMeme,
  customSoundId,
  removeCustomMeme,
} from '@/core/storage/customMemes'
import {
  buildCustomMeme,
  checkAudio,
  checkImage,
  findDuplicates,
  fitSize,
  PRIORITIES,
  triggerOptions,
} from '@/core/storage/memeFactory'
import { isQuotaError } from '@/store/album'
import { useMemes } from '@/store/memes'
import { useUi } from '@/store/ui'
import { triggerEmoji } from '@/i18n/gestures'
import { conditionLabel } from '@/i18n/gestures'
import { vi } from '@/i18n/vi'
import { exportPack, importPack } from '@/core/storage/memePack'
import { captureFilename, downloadBlob } from '@/core/capture/filename'

const SYNTHS = [
  'pop',
  'ting',
  'boing',
  'fanfare',
  'whoosh',
  'sparkle',
  'chime',
  'horn',
  'zap',
  'slideDown',
  'scratch',
]

type SoundMode = 'synth' | 'upload' | 'record'

async function resizeToWebp(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const { w, h } = fitSize(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const blob = await new Promise<Blob | null>((r) =>
    c.toBlob(r, 'image/webp', 0.9),
  )
  // Safari may not encode WebP: fall back to PNG.
  if (blob && blob.type === 'image/webp') return blob
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode'))),
      'image/png',
    ),
  )
}

async function audioDuration(blob: Blob): Promise<number> {
  const bus = getBus()
  if (!bus) throw new Error('audio-locked')
  const buf = await bus.ctx.decodeAudioData(await blob.arrayBuffer())
  return buf.duration
}

function drawPreview(
  canvas: HTMLCanvasElement,
  img: ImageBitmap | null,
  top: string,
  bottom: string,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const S = canvas.width
  ctx.clearRect(0, 0, S, S)
  ctx.fillStyle = '#eee'
  ctx.fillRect(0, 0, S, S)
  if (img) {
    const k = Math.min(S / img.width, S / img.height)
    const w = img.width * k
    const h = img.height * k
    ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
  }
  const fs = S * 0.11
  ctx.font = textFont(fs)
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.22
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'
  for (const [t, y, base] of [
    [top, fs * 0.2, 'top'],
    [bottom, S - fs * 0.2, 'bottom'],
  ] as const) {
    if (!t) continue
    ctx.textBaseline = base
    const tx = t.toLocaleUpperCase('vi')
    ctx.strokeText(tx, S / 2, y, S * 0.94)
    ctx.fillText(tx, S / 2, y, S * 0.94)
  }
}

export function MemeCreator() {
  const memes = useMemes((s) => s.memes)
  const rules = useMemes((s) => s.rules)
  const custom = memes.filter((m) => m.source === 'custom')
  const toast = (text: string) =>
    useUi.getState().showToast({ text, ttl: 4500 })

  const [name, setName] = useState('')
  const [top, setTop] = useState('')
  const [bottom, setBottom] = useState('')
  const [image, setImage] = useState<Blob | null>(null)
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [soundMode, setSoundMode] = useState<SoundMode>('synth')
  const [synth, setSynth] = useState('pop')
  const [soundBlob, setSoundBlob] = useState<Blob | null>(null)
  const [recording, setRecording] = useState(false)
  const [optionId, setOptionId] = useState(triggerOptions[0]!.id)
  const [priority, setPriority] = useState<number>(PRIORITIES.normal)
  const [challenge, setChallenge] = useState(true)
  const [busy, setBusy] = useState(false)
  const preview = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (preview.current) drawPreview(preview.current, bitmap, top, bottom)
  }, [bitmap, top, bottom])
  useEffect(() => () => bitmap?.close(), [bitmap])

  const option = triggerOptions.find((o) => o.id === optionId)!
  const dupes = findDuplicates(rules, option.conditions)

  async function onImage(file: File | undefined) {
    if (!file) return
    const check = checkImage(file.type, file.size)
    if (check !== 'ok')
      return toast(check === 'type' ? vi.creator.badType : vi.creator.tooBig)
    try {
      const webp = await resizeToWebp(file)
      setImage(webp)
      setBitmap(await createImageBitmap(webp))
    } catch {
      toast(vi.creator.badImage)
    }
  }

  async function onAudio(file: File | undefined) {
    if (!file) return
    try {
      const d = await audioDuration(file)
      const check = checkAudio(file.size, d)
      if (check !== 'ok')
        return toast(
          check === 'size' ? vi.creator.audioTooBig : vi.creator.audioTooLong,
        )
      setSoundBlob(file)
    } catch {
      toast(vi.creator.badAudio)
    }
  }

  async function record() {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return toast(vi.fx.micDenied)
    }
    const rec = new MediaRecorder(stream)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
      const blob = new Blob(chunks, { type: rec.mimeType })
      void onAudio(new File([blob], 'rec', { type: blob.type }))
    }
    setRecording(true)
    rec.start()
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), 3000)
  }

  function previewSound() {
    if (soundMode === 'synth') return void playSound(synth)
    if (!soundBlob) return
    const a = new Audio(URL.createObjectURL(soundBlob))
    a.onended = () => URL.revokeObjectURL(a.src)
    void a.play()
  }

  async function save() {
    if (!image) return toast(vi.creator.needImage)
    if (soundMode !== 'synth' && !soundBlob) return toast(vi.creator.needSound)
    setBusy(true)
    try {
      const id = 'custom-' + Date.now().toString(36)
      const soundId = soundMode === 'synth' ? synth : customSoundId(id)
      const def = buildCustomMeme({
        id,
        name,
        top,
        bottom,
        option,
        priority,
        soundId,
        includeInChallenge: challenge,
      })
      await createCustomMeme({
        def,
        image,
        sound: soundMode === 'synth' ? undefined : (soundBlob ?? undefined),
      })
      toast(vi.creator.saved)
      setName('')
      setTop('')
      setBottom('')
      setImage(null)
      setBitmap(null)
      setSoundBlob(null)
    } catch (e) {
      toast(isQuotaError(e) ? vi.album.quota : vi.capture.failed)
    } finally {
      setBusy(false)
    }
  }

  async function doExport() {
    try {
      downloadBlob(await exportPack(), captureFilename('memepack.zip'))
    } catch {
      toast(vi.capture.failed)
    }
  }

  async function doImport(file: File | undefined) {
    if (!file) return
    try {
      const n = await importPack(file)
      toast(vi.creator.imported.replace('{n}', String(n)))
    } catch {
      toast(vi.creator.badPack)
    }
  }

  return (
    <div className="panel-body creator">
      <canvas
        ref={preview}
        width={360}
        height={360}
        className="creator-preview"
        aria-label={vi.creator.preview}
      />
      <label className="file-btn">
        <Upload size={16} />{' '}
        {image ? vi.creator.changeImage : vi.creator.pickImage}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void onImage(e.target.files?.[0])}
        />
      </label>
      <label className="field">
        {vi.creator.name}
        <input
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder={vi.creator.namePh}
        />
      </label>
      <label className="field">
        {vi.creator.top}
        <input
          value={top}
          maxLength={40}
          onChange={(e) => setTop(e.target.value)}
        />
      </label>
      <label className="field">
        {vi.creator.bottom}
        <input
          value={bottom}
          maxLength={40}
          onChange={(e) => setBottom(e.target.value)}
        />
      </label>

      <h3 className="panel-sub">{vi.creator.sound}</h3>
      <div className="segmented" role="radiogroup">
        {(['synth', 'upload', 'record'] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={soundMode === m}
            className={soundMode === m ? 'on' : ''}
            onClick={() => setSoundMode(m)}
          >
            {vi.creator.soundModes[m]}
          </button>
        ))}
      </div>
      {soundMode === 'synth' && (
        <select
          className="field-input"
          value={synth}
          onChange={(e) => setSynth(e.target.value)}
          aria-label={vi.creator.sound}
        >
          {SYNTHS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      {soundMode === 'upload' && (
        <label className="file-btn">
          <Upload size={16} />{' '}
          {soundBlob ? vi.creator.audioReady : vi.creator.pickAudio}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => void onAudio(e.target.files?.[0])}
          />
        </label>
      )}
      {soundMode === 'record' && (
        <button
          className="ghost"
          disabled={recording}
          onClick={() => void record()}
        >
          <Mic size={16} />{' '}
          {recording
            ? vi.creator.recording
            : soundBlob
              ? vi.creator.reRecord
              : vi.creator.record3s}
        </button>
      )}
      <button className="link" onClick={previewSound}>
        <Play size={14} /> {vi.creator.listen}
      </button>

      <h3 className="panel-sub">{vi.creator.trigger}</h3>
      <div
        className="trigger-grid"
        role="radiogroup"
        aria-label={vi.creator.trigger}
      >
        {triggerOptions.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={optionId === o.id}
            className={'trigger-tile ' + (optionId === o.id ? 'on' : '')}
            onClick={() => setOptionId(o.id)}
          >
            <span aria-hidden className="trigger-emoji">
              {triggerEmoji({
                id: o.id,
                all: o.conditions,
                holdMs: 0,
                cooldownMs: 0,
                priority: 0,
                effect: '',
              })}
            </span>
            <span>
              {o.conditions
                .map(conditionLabel)
                .join(o.windowMs ? ' rồi ' : ' + ')}
            </span>
          </button>
        ))}
      </div>
      {dupes.length > 0 && (
        <p className="panel-note warn">
          {vi.creator.duplicate}:{' '}
          {dupes
            .map((d) => useMemes.getState().byRule(d.id)?.name ?? d.id)
            .join(', ')}
        </p>
      )}
      <label className="field">
        {vi.creator.priority}
        <select
          className="field-input"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        >
          <option value={PRIORITIES.low}>{vi.creator.prio.low}</option>
          <option value={PRIORITIES.normal}>{vi.creator.prio.normal}</option>
          <option value={PRIORITIES.high}>{vi.creator.prio.high}</option>
        </select>
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={challenge}
          onChange={(e) => setChallenge(e.target.checked)}
        />
        {vi.creator.inChallenge}
      </label>
      <button
        className="primary wide"
        disabled={busy}
        onClick={() => void save()}
      >
        {vi.creator.save}
      </button>

      <h3 className="panel-sub">{vi.creator.mine}</h3>
      {custom.length === 0 ? (
        <p className="panel-note">{vi.creator.empty}</p>
      ) : (
        <ul className="custom-list">
          {custom.map((m) => (
            <li key={m.id}>
              <span>{m.name}</span>
              <small>{triggerEmoji(m.trigger)}</small>
              <button
                className="round"
                aria-label={vi.creator.delete + ' ' + m.name}
                onClick={() => void removeCustomMeme(m.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="card-actions">
        <button
          className="ghost"
          disabled={!custom.length}
          onClick={() => void doExport()}
        >
          <Download size={16} /> {vi.creator.exportPack}
        </button>
        <label className="ghost file-btn">
          <Upload size={16} /> {vi.creator.importPack}
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => void doImport(e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  )
}
