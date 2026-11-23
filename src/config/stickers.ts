// Original, hand-authored SVG stickers (viewBox 100x100). Registry: add an
// entry here (or register an image URL at runtime) to ship a new sticker.
const O =
  'stroke="#2b1d33" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'
const svg = (body: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  body +
  '</svg>'

export interface StickerDef {
  id: string
  name: string
  svg: string
}

export const stickers: StickerDef[] = [
  {
    id: 'smile',
    name: 'Mặt cười',
    svg: svg(
      `<circle cx="50" cy="50" r="40" fill="#ffd84d" ${O}/><circle cx="36" cy="42" r="5" fill="#2b1d33"/><circle cx="64" cy="42" r="5" fill="#2b1d33"/><path d="M32 60q18 18 36 0" fill="none" ${O}/>`,
    ),
  },
  {
    id: 'heart',
    name: 'Tim',
    svg: svg(
      `<path d="M50 85L18 52a18 18 0 0 1 32-24a18 18 0 0 1 32 24z" fill="#ff5f8f" ${O}/><circle cx="34" cy="40" r="5" fill="#fff" opacity=".8"/>`,
    ),
  },
  {
    id: 'star',
    name: 'Sao',
    svg: svg(
      `<path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" fill="#ffe14d" ${O}/>`,
    ),
  },
  {
    id: 'pixel-shades',
    name: 'Kính râm pixel',
    svg: svg(
      `<path d="M8 38h84v8h-8v8h-8v8H60v-8h-8v-8h-4v8h-8v8H24v-8h-8v-8H8z" fill="#111" stroke="#111" stroke-width="2"/><path d="M20 46h6v6h-6zM60 46h6v6h-6z" fill="#fff"/>`,
    ),
  },
  {
    id: 'crown',
    name: 'Vương miện',
    svg: svg(
      `<path d="M14 72L10 30l22 18 18-28 18 28 22-18-4 42z" fill="#ffc93c" ${O}/><circle cx="50" cy="58" r="6" fill="#ff5f8f" ${O}/><path d="M14 80h72" ${O}/>`,
    ),
  },
  {
    id: 'cat-ears',
    name: 'Tai mèo',
    svg: svg(
      `<path d="M10 80L22 18l30 34zM90 80L78 18 48 52z" fill="#3b2a45" ${O}/><path d="M24 34l4 26 12-12zM76 34l-4 26-12-12z" fill="#ffb5d8"/>`,
    ),
  },
  {
    id: 'bubble',
    name: 'Bong bóng thoại',
    svg: svg(
      `<path d="M14 20h72a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H44L26 86l4-18H14a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6z" fill="#fff" ${O}/><circle cx="34" cy="44" r="4" fill="#2b1d33"/><circle cx="50" cy="44" r="4" fill="#2b1d33"/><circle cx="66" cy="44" r="4" fill="#2b1d33"/>`,
    ),
  },
  {
    id: 'arrow',
    name: 'Mũi tên',
    svg: svg(`<path d="M10 42h50V24l32 26-32 26V58H10z" fill="#5ad1ff" ${O}/>`),
  },
  {
    id: 'fire',
    name: 'Lửa',
    svg: svg(
      `<path d="M50 92c-20 0-32-14-30-32 2-16 14-22 14-38 12 8 16 18 14 28 6-4 8-10 8-16 14 12 20 26 18 38-2 12-12 20-24 20z" fill="#ff7a2f" ${O}/><path d="M50 88c-8 0-14-6-12-14 2-6 8-8 8-16 8 6 14 12 14 18 0 8-4 12-10 12z" fill="#ffd84d"/>`,
    ),
  },
  {
    id: 'bolt',
    name: 'Sấm sét',
    svg: svg(`<path d="M58 6L18 56h26l-8 38 42-54H52z" fill="#ffe600" ${O}/>`),
  },
  {
    id: 'sparkles',
    name: 'Lấp lánh',
    svg: svg(
      `<path d="M40 10q4 26 26 30-22 4-26 30-4-26-26-30 22-4 26-30z" fill="#fff59a" ${O}/><path d="M74 54q2 14 14 16-12 2-14 16-2-14-14-16 12-2 14-16z" fill="#cdb4ff" ${O}/>`,
    ),
  },
  {
    id: 'rainbow',
    name: 'Cầu vồng',
    svg: svg(
      `<path d="M8 72a42 42 0 0 1 84 0" fill="none" stroke="#ff5f5f" stroke-width="9"/><path d="M18 72a32 32 0 0 1 64 0" fill="none" stroke="#ffd84d" stroke-width="9"/><path d="M28 72a22 22 0 0 1 44 0" fill="none" stroke="#5ad17a" stroke-width="9"/><path d="M38 72a12 12 0 0 1 24 0" fill="none" stroke="#5ab8ff" stroke-width="9"/>`,
    ),
  },
  {
    id: 'cloud',
    name: 'Mây',
    svg: svg(
      `<path d="M26 74a16 16 0 0 1 0-32 22 22 0 0 1 42-6 18 18 0 0 1 8 38z" fill="#fff" ${O}/>`,
    ),
  },
  {
    id: 'flower',
    name: 'Hoa',
    svg: svg(
      `<g fill="#ffb5d8" ${O}><circle cx="50" cy="26" r="15"/><circle cx="74" cy="44" r="15"/><circle cx="64" cy="72" r="15"/><circle cx="36" cy="72" r="15"/><circle cx="26" cy="44" r="15"/></g><circle cx="50" cy="52" r="11" fill="#ffd84d" ${O}/>`,
    ),
  },
  {
    id: 'paw',
    name: 'Chân mèo',
    svg: svg(
      `<g fill="#ffb5d8" ${O}><ellipse cx="50" cy="66" rx="20" ry="17"/><circle cx="24" cy="44" r="9"/><circle cx="40" cy="30" r="9"/><circle cx="60" cy="30" r="9"/><circle cx="76" cy="44" r="9"/></g>`,
    ),
  },
  {
    id: 'ghost',
    name: 'Ma nhỏ',
    svg: svg(
      `<path d="M22 88V44a28 28 0 0 1 56 0v44l-9-8-9 8-10-8-10 8-9-8z" fill="#fff" ${O}/><circle cx="40" cy="44" r="5" fill="#2b1d33"/><circle cx="60" cy="44" r="5" fill="#2b1d33"/><ellipse cx="50" cy="60" rx="5" ry="6" fill="#2b1d33"/>`,
    ),
  },
  {
    id: 'cool-face',
    name: 'Mặt ngầu',
    svg: svg(
      `<circle cx="50" cy="50" r="40" fill="#ffd84d" ${O}/><path d="M18 40h64v6q-2 12-14 12t-14-12h-8q-2 12-14 12t-14-12z" fill="#111"/><path d="M36 68q14 6 28-2" fill="none" ${O}/>`,
    ),
  },
  {
    id: 'cry-laugh',
    name: 'Cười ra nước mắt',
    svg: svg(
      `<circle cx="50" cy="50" r="40" fill="#ffd84d" ${O}/><path d="M28 42q8-8 14 0M58 42q8-8 14 0" fill="none" ${O}/><path d="M28 56h44q-4 22-22 22T28 56z" fill="#7a2b3b" ${O}/><path d="M18 46q-8 14 2 20q6-8-2-20zM82 46q8 14-2 20q-6-8 2-20z" fill="#5ab8ff"/>`,
    ),
  },
  {
    id: 'shock',
    name: 'Sốc',
    svg: svg(
      `<circle cx="50" cy="50" r="40" fill="#ffe0b5" ${O}/><circle cx="36" cy="40" r="8" fill="#fff" ${O}/><circle cx="64" cy="40" r="8" fill="#fff" ${O}/><ellipse cx="50" cy="66" rx="9" ry="12" fill="#2b1d33"/>`,
    ),
  },
  {
    id: 'kiss',
    name: 'Môi hôn',
    svg: svg(
      `<path d="M10 50q20-24 40-8 20-16 40 8-20 26-40 26T10 50z" fill="#ff3b6b" ${O}/><path d="M16 50q34 6 68 0" fill="none" ${O}/>`,
    ),
  },
  {
    id: 'question',
    name: 'Dấu hỏi',
    svg: svg(
      `<path d="M30 34a20 20 0 1 1 30 18c-6 4-8 8-8 14" fill="none" stroke="#2b1d33" stroke-width="16" stroke-linecap="round"/><path d="M30 34a20 20 0 1 1 30 18c-6 4-8 8-8 14" fill="none" stroke="#ff9f1c" stroke-width="9" stroke-linecap="round"/><circle cx="52" cy="86" r="8" fill="#ff9f1c" ${O}/>`,
    ),
  },
  {
    id: 'exclaim',
    name: 'Chấm than',
    svg: svg(
      `<path d="M40 10h20l-4 54H44z" fill="#ff3b30" ${O}/><circle cx="50" cy="82" r="9" fill="#ff3b30" ${O}/>`,
    ),
  },
  {
    id: 'devil-horns',
    name: 'Sừng quỷ',
    svg: svg(
      `<path d="M14 80q-4-40 22-62-4 26 10 44zM86 80q4-40-22-62 4 26-10 44z" fill="#e8323c" ${O}/>`,
    ),
  },
  {
    id: 'balloon',
    name: 'Bóng bay',
    svg: svg(
      `<ellipse cx="50" cy="40" rx="26" ry="32" fill="#cdb4ff" ${O}/><path d="M46 72h8l-4 6z" fill="#cdb4ff" ${O}/><path d="M50 78q-8 8 0 16" fill="none" ${O}/><ellipse cx="40" cy="28" rx="5" ry="9" fill="#fff" opacity=".7"/>`,
    ),
  },
  {
    id: 'music',
    name: 'Nốt nhạc',
    svg: svg(
      `<path d="M38 74V22l40-8v52" fill="none" ${O}/><ellipse cx="28" cy="76" rx="12" ry="9" fill="#39ff14" ${O}/><ellipse cx="68" cy="68" rx="12" ry="9" fill="#39ff14" ${O}/><path d="M38 34l40-8" ${O}/>`,
    ),
  },
]

const images = new Map<string, HTMLImageElement>()

/** Decoded image for a sticker, created once and reused (null until ready). */
export function stickerImage(id: string): HTMLImageElement | null {
  let img = images.get(id)
  if (!img) {
    const def = stickers.find((s) => s.id === id)
    if (!def || typeof Image === 'undefined') return null
    img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(def.svg)
    images.set(id, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

export function stickerDataUrl(id: string): string {
  const def = stickers.find((s) => s.id === id)
  return def
    ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(def.svg)
    : ''
}

/** Base sticker size as a fraction of stage width at scale 1. */
export const STICKER_SIZE = 0.13
export const TEXT_SIZE = 0.055
