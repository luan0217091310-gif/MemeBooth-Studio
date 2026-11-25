// Face-anchored AR props. `anchor` picks the face-mesh reference point;
// `offset` is in eye-distance units (x right, y down) in the face's own frame;
// `scaleFactor` sets the prop width in eye-distance units.
export type PropAnchor =
  'eyes' | 'forehead' | 'nose' | 'chin' | 'mouth' | 'cheeks'

export interface PropDef {
  id: string
  name: string
  anchor: PropAnchor
  offset: { x: number; y: number }
  scaleFactor: number
  /** Aspect of the SVG (height / width). */
  aspect: number
  /** Narrows with yaw (e.g. glasses). */
  yawSquash: boolean
  svg: string
}

const S = (vb: string, body: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
  vb +
  '">' +
  body +
  '</svg>'
const O = 'stroke="#2b1d33" stroke-width="3" stroke-linejoin="round"'

export const props: PropDef[] = [
  {
    id: 'cat-ears',
    name: 'Tai mèo',
    anchor: 'forehead',
    offset: { x: 0, y: -0.75 },
    scaleFactor: 2.6,
    aspect: 0.45,
    yawSquash: true,
    svg: S(
      '0 0 200 90',
      `<path d="M10 88L30 6l52 62zM190 88L170 6l-52 62z" fill="#3b2a45" ${O}/><path d="M34 28l8 40 22-22zM166 28l-8 40-22-22z" fill="#ffb5d8"/>`,
    ),
  },
  {
    id: 'meme-shades',
    name: 'Kính râm meme',
    anchor: 'eyes',
    offset: { x: 0, y: 0.05 },
    scaleFactor: 2.3,
    aspect: 0.3,
    yawSquash: true,
    svg: S(
      '0 0 200 60',
      '<path d="M0 4h200v14h-12v14h-12v14h-48V32h-12V18h-32v14H72v14H24V32H12V18H0z" fill="#111"/><path d="M36 18h12v12H36zM140 18h12v12h-12z" fill="#fff"/>',
    ),
  },
  {
    id: 'crown',
    name: 'Vương miện',
    anchor: 'forehead',
    offset: { x: 0, y: -0.85 },
    scaleFactor: 2.0,
    aspect: 0.6,
    yawSquash: true,
    svg: S(
      '0 0 200 120',
      `<path d="M14 112L6 30l46 38 48-60 48 60 46-38-8 82z" fill="#ffc93c" ${O}/><circle cx="100" cy="80" r="12" fill="#ff5f8f" ${O}/><circle cx="46" cy="90" r="8" fill="#5ab8ff" ${O}/><circle cx="154" cy="90" r="8" fill="#5ab8ff" ${O}/>`,
    ),
  },
  {
    id: 'blush',
    name: 'Má hồng',
    anchor: 'cheeks',
    offset: { x: 0, y: 0.55 },
    scaleFactor: 2.4,
    aspect: 0.25,
    yawSquash: true,
    svg: S(
      '0 0 200 50',
      '<ellipse cx="28" cy="25" rx="26" ry="16" fill="#ff7fa8" opacity=".55"/><ellipse cx="172" cy="25" rx="26" ry="16" fill="#ff7fa8" opacity=".55"/><path d="M14 24l8-8M26 26l8-8M166 24l8-8M178 26l8-8" stroke="#fff" stroke-width="3" opacity=".8"/>',
    ),
  },
  {
    id: 'whiskers',
    name: 'Râu mèo',
    anchor: 'nose',
    offset: { x: 0, y: 0.25 },
    scaleFactor: 2.8,
    aspect: 0.35,
    yawSquash: true,
    svg: S(
      '0 0 200 70',
      '<g stroke="#2b1d33" stroke-width="4" stroke-linecap="round" fill="none"><path d="M70 30L4 14M70 38L2 40M70 46L6 64M130 30l66-16M130 38l68 2M130 46l64 18"/></g><ellipse cx="100" cy="34" rx="10" ry="7" fill="#ff7fa8"/>',
    ),
  },
  {
    id: 'devil-horns',
    name: 'Sừng quỷ nhỏ',
    anchor: 'forehead',
    offset: { x: 0, y: -0.7 },
    scaleFactor: 2.2,
    aspect: 0.4,
    yawSquash: true,
    svg: S(
      '0 0 200 80',
      `<path d="M30 78q-14-40 18-72-4 34 18 58zM170 78q14-40-18-72 4 34-18 58z" fill="#e8323c" ${O}/>`,
    ),
  },
  {
    id: 'bunny-ears',
    name: 'Tai thỏ Pastel',
    anchor: 'forehead',
    offset: { x: 0, y: -1.1 },
    scaleFactor: 2.3,
    aspect: 0.8,
    yawSquash: true,
    svg: S(
      '0 0 200 160',
      `<ellipse cx="56" cy="82" rx="26" ry="70" transform="rotate(-10 56 82)" fill="#fffaf5" ${O}/><ellipse cx="56" cy="88" rx="13" ry="48" transform="rotate(-10 56 88)" fill="#ffb5d8"/><ellipse cx="144" cy="82" rx="26" ry="70" transform="rotate(10 144 82)" fill="#fffaf5" ${O}/><ellipse cx="144" cy="88" rx="13" ry="48" transform="rotate(10 144 88)" fill="#ffb5d8"/>`,
    ),
  },
  {
    id: 'angel-halo',
    name: 'Hào quang',
    anchor: 'forehead',
    offset: { x: 0, y: -1.15 },
    scaleFactor: 2.1,
    aspect: 0.35,
    yawSquash: false,
    svg: S(
      '0 0 200 70',
      '<ellipse cx="100" cy="35" rx="82" ry="20" fill="none" stroke="#fff3a3" stroke-width="14" opacity=".45"/><ellipse cx="100" cy="35" rx="82" ry="20" fill="none" stroke="#ffd84d" stroke-width="7"/><path d="M18 18l4 10 10 4-10 4-4 10-4-10-10-4 10-4zM182 14l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff"/>',
    ),
  },
  {
    id: 'heart-glasses',
    name: 'Kính trái tim',
    anchor: 'eyes',
    offset: { x: 0, y: 0.05 },
    scaleFactor: 2.35,
    aspect: 0.42,
    yawSquash: true,
    svg: S(
      '0 0 220 92',
      `<path d="M56 80C24 62 10 42 10 26a22 22 0 0140-12 22 22 0 0140 12c0 16-14 36-34 54z" fill="#ff5fa2" fill-opacity=".82" stroke="#fff" stroke-width="5"/><path d="M164 80c-20-18-34-38-34-54a22 22 0 0140-12 22 22 0 0140 12c0 16-14 36-46 54z" fill="#ff5fa2" fill-opacity=".82" stroke="#fff" stroke-width="5"/><path d="M90 34h40" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M28 24q8-8 16 0M148 24q8-8 16 0" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8" fill="none"/>`,
    ),
  },
  {
    id: 'coquette-bow',
    name: 'Nơ hồng Coquette',
    anchor: 'forehead',
    offset: { x: 0, y: -0.82 },
    scaleFactor: 1.9,
    aspect: 0.55,
    yawSquash: true,
    svg: S(
      '0 0 200 110',
      `<path d="M100 48C72 16 20 8 16 44c-4 32 42 36 84 12zM100 48c28-32 80-40 84-4 4 32-42 36-84 12z" fill="#ff9ec8" ${O}/><path d="M92 56l-24 46 20-8 12-34zM108 56l24 46-20-8-12-34z" fill="#ffb5d8" ${O}/><circle cx="100" cy="52" r="14" fill="#ff7db5" ${O}/>`,
    ),
  },
]
