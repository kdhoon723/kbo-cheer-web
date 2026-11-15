//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { isTextEntry, shortcutAction } from './shortcuts.ts'
import type { ShortcutKey } from './shortcuts.ts'

function key(code: string, k: string, extra: Partial<ShortcutKey> = {}): ShortcutKey {
  return { code, key: k, ctrlKey: false, metaKey: false, altKey: false, repeat: false, ...extra }
}

describe('shortcutAction', () => {
  it('BR-36 키 배정대로 동작을 고른다', () => {
    expect(shortcutAction(key('Space', ' '), false)).toEqual({ type: 'stop' })
    expect(shortcutAction(key('KeyS', 's'), false)).toEqual({ type: 'cheer' })
    expect(shortcutAction(key('KeyT', 't'), false)).toEqual({ type: 'prevTeam' })
    expect(shortcutAction(key('Slash', '/'), false)).toEqual({ type: 'focusSearch' })
    expect(shortcutAction(key('Escape', 'Escape'), false)).toEqual({ type: 'clearSearch' })
  })

  it('숫자 1~9는 상황 버튼 0~8번째다', () => {
    expect(shortcutAction(key('Digit1', '1'), false)).toEqual({ type: 'situation', index: 0 })
    expect(shortcutAction(key('Digit9', '9'), false)).toEqual({ type: 'situation', index: 8 })
    expect(shortcutAction(key('Digit0', '0'), false)).toBeNull()
  })

  it('한글 입력 상태에서도 물리 키 위치로 판단한다', () => {
    expect(shortcutAction(key('KeyS', 'ㄴ'), false)).toEqual({ type: 'cheer' })
    expect(shortcutAction(key('KeyT', 'ㅅ'), false)).toEqual({ type: 'prevTeam' })
    expect(shortcutAction(key('KeyS', 'S', { key: 'S' }), false)).toEqual({ type: 'cheer' })
  })

  it('입력칸에 커서가 있으면 Esc만 동작한다', () => {
    expect(shortcutAction(key('KeyS', 's'), true)).toBeNull()
    expect(shortcutAction(key('KeyS', 'ㄴ'), true)).toBeNull()
    expect(shortcutAction(key('Space', ' '), true)).toBeNull()
    expect(shortcutAction(key('Slash', '/'), true)).toBeNull()
    expect(shortcutAction(key('Digit1', '1'), true)).toBeNull()
    expect(shortcutAction(key('Escape', 'Escape'), true)).toEqual({ type: 'clearSearch' })
  })

  it('Ctrl·Meta·Alt 조합과 누르고 있어 반복되는 키는 무시한다', () => {
    expect(shortcutAction(key('KeyS', 's', { ctrlKey: true }), false)).toBeNull()
    expect(shortcutAction(key('KeyT', 't', { metaKey: true }), false)).toBeNull()
    expect(shortcutAction(key('Digit1', '1', { altKey: true }), false)).toBeNull()
    expect(shortcutAction(key('Space', ' ', { repeat: true }), false)).toBeNull()
    expect(shortcutAction(key('Escape', 'Escape', { ctrlKey: true }), true)).toBeNull()
  })

  it('배정되지 않은 키는 null이다', () => {
    expect(shortcutAction(key('KeyA', 'a'), false)).toBeNull()
    expect(shortcutAction(key('Enter', 'Enter'), false)).toBeNull()
  })
})

describe('isTextEntry', () => {
  it('글자를 받는 입력칸, 선택 상자, 편집 가능한 요소는 입력 중이다', () => {
    expect(isTextEntry({ tagName: 'INPUT', type: 'search' })).toBe(true)
    expect(isTextEntry({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(isTextEntry({ tagName: 'INPUT' })).toBe(true)
    expect(isTextEntry({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTextEntry({ tagName: 'SELECT' })).toBe(true)
    expect(isTextEntry({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('버튼, 볼륨 슬라이더, 빈 대상은 입력 중이 아니다', () => {
    expect(isTextEntry({ tagName: 'BUTTON' })).toBe(false)
    expect(isTextEntry({ tagName: 'INPUT', type: 'range' })).toBe(false)
    expect(isTextEntry({ tagName: 'INPUT', type: 'checkbox' })).toBe(false)
    expect(isTextEntry({ tagName: 'BODY', isContentEditable: false })).toBe(false)
    expect(isTextEntry(null)).toBe(false)
  })
})
