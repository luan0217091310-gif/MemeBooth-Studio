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
]
