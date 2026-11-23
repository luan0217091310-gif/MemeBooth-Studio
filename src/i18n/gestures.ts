import type { Condition, DerivedId, HandGestureId, TriggerRule } from '@/types'

export const handGestureName: Record<HandGestureId, string> = {
  POINT: '1 ngón',
  PINCH: 'Chụm ngón',
  TWO_FINGER: '2 ngón',
  VICTORY: 'Chữ V',
  OPEN_PALM: 'Xoè tay',
  FIST: 'Nắm tay',
  THUMB_UP: 'Like',
  THUMB_DOWN: 'Dislike',
  I_LOVE_YOU: 'I love you',
}

export const derivedName: Record<DerivedId, string> = {
  HEART_TWO_HANDS: 'Tim 2 tay',
  WINK: 'Nháy mắt',
  MOUTH_OPEN: 'Há miệng',
  SMILE: 'Cười',
  PUCKER: 'Chu môi',
  BROW_UP: 'Nhướn mày',
  CHEEK_PUFF: 'Phồng má',
}

export const gestureEmoji: Partial<Record<HandGestureId | DerivedId, string>> =
  {
    POINT: '☝️',
    PINCH: '🤏',
    TWO_FINGER: '✌️',
    VICTORY: '✌️',
    OPEN_PALM: '🖐️',
    FIST: '✊',
    THUMB_UP: '👍',
    THUMB_DOWN: '👎',
    I_LOVE_YOU: '🤟',
    HEART_TWO_HANDS: '🫶',
    WINK: '😉',
    MOUTH_OPEN: '😮',
    SMILE: '😄',
    PUCKER: '😗',
    BROW_UP: '🤨',
    CHEEK_PUFF: '🐡',
  }

export function conditionLabel(c: Condition): string {
  if (c.kind === 'hand')
    return (c.hands === 'both' ? '2 tay ' : '') + handGestureName[c.gesture]
  if (c.kind === 'derived') return derivedName[c.id]
  return c.blendshape
}

export function triggerLabel(rule: TriggerRule): string {
  const parts = rule.all.map(conditionLabel)
  return parts.join(rule.windowMs ? ' rồi ' : ' + ')
}

export function triggerEmoji(rule: TriggerRule): string {
  return rule.all
    .map((c) =>
      c.kind === 'hand'
        ? (gestureEmoji[c.gesture] ?? '')
        : c.kind === 'derived'
          ? (gestureEmoji[c.id] ?? '')
          : '',
    )
    .join('')
}
