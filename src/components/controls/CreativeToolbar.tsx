import { useState } from 'react'
import { Eraser, Pencil, Redo2, Trash2, Type, Undo2 } from 'lucide-react'
import { getStageEngine } from '@/components/stage/CameraStage'
import { brushOrder } from '@/core/canvas/brushes'
import { STICKER_SIZE, stickerDataUrl, stickers } from '@/config/stickers'
import { newId, useScene } from '@/store/scene'
import { useVibe } from '@/store/vibe'
import type { SceneItem, TextStyle } from '@/types'
import { vi } from '@/i18n/vi'

const WIDTHS = [0.005, 0.008, 0.013, 0.02]

type NewItem = SceneItem extends infer T
  ? T extends SceneItem
    ? Omit<T, 'id' | 'z'>
    : never
  : never

export function addItem(item: NewItem) {
  const { items, commit } = useScene.getState()
  const z = Math.max(0, ...items.map((i) => i.z)) + 1
  commit({ items: [...items, { ...item, id: newId('i'), z } as SceneItem] })
}

/** Spawn near the stage center with a little jitter so items do not stack. */
function spawnPoint() {
  return {
    x: 0.5 + (Math.random() - 0.5) * 0.2,
    y: 0.45 + (Math.random() - 0.5) * 0.2,
  }
}

export function TextModal(props: { onClose(): void }) {
  const [text, setText] = useState('')
  const [style, setStyle] = useState<TextStyle>('meme')
  const color = useScene((s) => s.color)
  const submit = () => {
    const value = text.trim()
    if (value)
      addItem({
        kind: 'text',
        text: value,
        style,
        color,
        ...spawnPoint(),
        scale: 0.7,
        rotation: 0,
      })
    props.onClose()
  }
  return (
    <div
      className="stage-card text-modal"
      role="dialog"
      aria-labelledby="text-title"
    >
      <h2 id="text-title">{vi.draw.textTitle}</h2>
      <textarea
        autoFocus
        rows={2}
        maxLength={80}
        value={text}
        placeholder={vi.draw.textPlaceholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') props.onClose()
        }}
      />
      <div className="segmented" role="radiogroup">
        {(['meme', 'cute'] as const).map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={style === s}
            className={style === s ? 'on' : ''}
            onClick={() => setStyle(s)}
          >
            {s === 'meme' ? vi.draw.styleMeme : vi.draw.styleCute}
          </button>
        ))}
      </div>
      <div className="card-actions">
        <button className="primary" onClick={submit}>
          {vi.draw.add}
        </button>
        <button className="ghost" onClick={props.onClose}>
          {vi.draw.cancel}
        </button>
      </div>
    </div>
  )
}

/** Always-visible quick actions (left): pen/eraser, undo/redo, clear. */
export function QuickBar() {
  const s = useScene()
  return (
    <aside className="quickbar" aria-label={vi.draw.tools}>
      <button
        className={'tool ' + (s.tool === 'pen' ? 'on' : '')}
        aria-label={vi.draw.pen}
        aria-pressed={s.tool === 'pen'}
        onClick={() => s.setTool('pen')}
      >
        <Pencil size={18} />
      </button>
      <button
        className={'tool ' + (s.tool === 'eraser' ? 'on' : '')}
        aria-label={vi.draw.eraser}
        aria-pressed={s.tool === 'eraser'}
        onClick={() => s.setTool('eraser')}
      >
        <Eraser size={18} />
      </button>
      <span className="sep" />
      <button
        className="tool"
        aria-label={vi.draw.undo}
        disabled={!s.past.length}
        onClick={s.undo}
      >
        <Undo2 size={18} />
      </button>
      <button
        className="tool"
        aria-label={vi.draw.redo}
        disabled={!s.future.length}
        onClick={s.redo}
      >
        <Redo2 size={18} />
      </button>
      <button
        className="tool"
        aria-label={vi.draw.clear}
        disabled={!s.strokes.length && !s.items.length}
        onClick={() => getStageEngine()?.controller.clearBoard()}
      >
        <Trash2 size={18} />
      </button>
    </aside>
  )
}

export function BrushPanel() {
  const s = useScene()
  const palette = useVibe((v) => v.preset.brush.palette)
  return (
    <div className="panel-body">
      <h3 className="panel-sub">{vi.draw.brush}</h3>
      <div className="brush-grid">
        {brushOrder.map((id) => (
          <button
            key={id}
            className={
              'brush-tile ' + (s.brushId === id && s.tool === 'pen' ? 'on' : '')
            }
            aria-pressed={s.brushId === id && s.tool === 'pen'}
            onClick={() => s.setBrush(id)}
          >
            <i className="brush" data-brush={id} />
            <span>{vi.draw.brushes[id]}</span>
          </button>
        ))}
      </div>
      <h3 className="panel-sub">{vi.draw.color}</h3>
      <div className="swatches">
        {palette.map((c) => (
          <button
            key={c}
            className={'swatch ' + (s.color === c ? 'on' : '')}
            style={{ background: c }}
            aria-label={vi.draw.color + ' ' + c}
            aria-pressed={s.color === c}
            onClick={() => s.setColor(c)}
          />
        ))}
        <label className="swatch custom" aria-label={vi.draw.customColor}>
          <input
            type="color"
            value={s.color}
            onChange={(e) => s.setColor(e.target.value)}
          />
        </label>
      </div>
      <h3 className="panel-sub">{vi.draw.size}</h3>
      <div className="swatches">
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={'tool size ' + (s.width === w ? 'on' : '')}
            aria-label={vi.draw.size + ' ' + Math.round(w * 1000)}
            aria-pressed={s.width === w}
            onClick={() => s.setWidth(w)}
          >
            <i style={{ width: 4 + w * 700, height: 4 + w * 700 }} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function StickerPanel() {
  const [textOpen, setTextOpen] = useState(false)
  return (
    <div className="panel-body">
      <button className="primary wide" onClick={() => setTextOpen(true)}>
        <Type size={18} />
        {vi.draw.text}
      </button>
      <h3 className="panel-sub">{vi.draw.stickers}</h3>
      <div className="sticker-grid" role="list">
        {stickers.map((st) => (
          <button
            key={st.id}
            role="listitem"
            aria-label={st.name}
            title={st.name}
            onClick={() =>
              addItem({
                kind: 'sticker',
                stickerId: st.id,
                ...spawnPoint(),
                scale: 0.12 / STICKER_SIZE,
                rotation: 0,
              })
            }
          >
            <img src={stickerDataUrl(st.id)} alt="" width={40} height={40} />
          </button>
        ))}
      </div>
      <p className="panel-note">{vi.draw.stickerNote}</p>
      {textOpen && <TextModal onClose={() => setTextOpen(false)} />}
    </div>
  )
}
