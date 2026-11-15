//20241476-김도훈-(2026-11-15)

export type ShortcutAction =
  | { type: 'stop' }
  | { type: 'cheer' }
  | { type: 'prevTeam' }
  | { type: 'focusSearch' }
  | { type: 'clearSearch' }
  | { type: 'situation'; index: number }

export interface ShortcutKey {
  code: string
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  repeat: boolean
}

// 글자 키는 물리 키 위치(code)로 본다. 한글 입력 상태에서는 S·T의 key가 ㄴ·ㅅ로 들어온다
const BY_CODE = new Map<string, ShortcutAction>([
  ['Space', { type: 'stop' }],
  ['KeyS', { type: 'cheer' }],
  ['KeyT', { type: 'prevTeam' }],
])
const DIGIT = /^Digit([1-9])$/

export function shortcutAction(e: ShortcutKey, inInput: boolean): ShortcutAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null
  if (e.key === 'Escape') return { type: 'clearSearch' }
  if (inInput) return null
  const byCode = BY_CODE.get(e.code)
  if (byCode) return byCode
  if (e.key === '/') return { type: 'focusSearch' }
  const digit = DIGIT.exec(e.code)
  return digit ? { type: 'situation', index: Number(digit[1]) - 1 } : null
}

// 글자를 받지 않는 입력(볼륨 슬라이더 등)에 포커스가 있을 때는 단축키를 막지 않는다
const NON_TEXT_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'])

export interface KeyTarget {
  tagName: string
  type?: string
  isContentEditable?: boolean
}

/** 글자를 입력받는 대상인가(검색칸, 입력칸, 선택 상자, 편집 가능한 요소) */
export function isTextEntry(el: KeyTarget | null): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName.toUpperCase()
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  return tag === 'INPUT' && !NON_TEXT_INPUT_TYPES.has((el.type ?? 'text').toLowerCase())
}
