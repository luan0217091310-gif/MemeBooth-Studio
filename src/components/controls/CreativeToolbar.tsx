import { useState } from 'react'
import { Eraser, Pencil, Redo2, Smile, Trash2, Type, Undo2 } from 'lucide-react'
import { getStageEngine } from '@/components/stage/CameraStage'
import { brushOrder } from '@/core/canvas/brushes'
import { STICKER_SIZE, stickerDataUrl, stickers } from '@/config/stickers'
import { newId, useScene } from '@/store/scene'
import type { SceneItem, TextStyle } from '@/types'
import { vi } from '@/i18n/vi'

export const PALETTE = [
  '#ff5fa2',
  '#ffb5d8',
  '#cdb4ff',
  '#5ab8ff',
  '#39ff14',
  '#ffe600',
  '#ff7a2f',
  '#ffffff',
  '#111111',
]

const WIDTHS = [0.005, 0.008, 0.013, 0.02]

type NewItem = SceneItem extends infer T
  ? T extends SceneItem
    ? Omit<T, 'id' | 'z'>
    : never
  : never

function addItem(item: NewItem) {
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

function TextModal(props: { onClose(): void }) {
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

export function CreativeToolbar() {
  const s = useScene()
  const [panel, setPanel] = useState<'none' | 'stickers' | 'text'>('none')
  const toggle = (p: typeof panel) => setPanel(panel === p ? 'none' : p)
  return (
    <>
      <div className="mode-chip" role="radiogroup" aria-label={vi.draw.mode}>
        {(['draw', 'meme'] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={s.mode === m}
            className={s.mode === m ? 'on' : ''}
            onClick={() => s.setMode(m)}
          >
            {m === 'draw' ? vi.draw.modeDraw : vi.draw.modeMeme}
          </button>
        ))}
      </div>
      <aside className="toolbar" aria-label={vi.draw.tools}>
        <div className="tool-group">
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
        </div>
        <div className="tool-group brushes">
          {brushOrder.map((id) => (
            <button
              key={id}
              className={
                'brush ' + (s.brushId === id && s.tool === 'pen' ? 'on' : '')
              }
              data-brush={id}
              aria-label={vi.draw.brushes[id]}
              title={vi.draw.brushes[id]}
              aria-pressed={s.brushId === id}
              onClick={() => s.setBrush(id)}
            />
          ))}
        </div>
        <div className="tool-group colors">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={'swatch ' + (s.color === c ? 'on' : '')}
              style={{ background: c }}
              aria-label={vi.draw.color + ' ' + c}
              aria-pressed={s.color === c}
              onClick={() => s.setColor(c)}
            />
          ))}
        </div>
        <div className="tool-group">
          {WIDTHS.map((w) => (
            <button
              key={w}
              className={'tool size ' + (s.width === w ? 'on' : '')}
              aria-label={vi.draw.size + ' ' + w}
              aria-pressed={s.width === w}
              onClick={() => s.setWidth(w)}
            >
              <i style={{ width: 4 + w * 700, height: 4 + w * 700 }} />
            </button>
          ))}
        </div>
        <div className="tool-group">
          <button
            className={'tool ' + (panel === 'stickers' ? 'on' : '')}
            aria-label={vi.draw.stickers}
            aria-expanded={panel === 'stickers'}
            onClick={() => toggle('stickers')}
          >
            <Smile size={18} />
          </button>
          <button
            className="tool"
            aria-label={vi.draw.text}
            onClick={() => toggle('text')}
          >
            <Type size={18} />
          </button>
        </div>
        <div className="tool-group">
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
        </div>
      </aside>
      {panel === 'stickers' && (
        <div
          className="sticker-panel"
          role="listbox"
          aria-label={vi.draw.stickers}
        >
          {stickers.map((st) => (
            <button
              key={st.id}
              role="option"
              aria-selected={false}
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
      )}
      {panel === 'text' && <TextModal onClose={() => setPanel('none')} />}
      <p className="gesture-hint">{vi.draw.hint}</p>
    </>
  )
}
