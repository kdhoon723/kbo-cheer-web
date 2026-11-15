//20241476-김도훈-(2026-11-15)
import { useEffect, useRef } from 'react'
import { isTextEntry, shortcutAction } from '../lib/shortcuts.ts'
import type { ShortcutAction } from '../lib/shortcuts.ts'

function targetElement(e: KeyboardEvent): HTMLElement | null {
  return e.target instanceof HTMLElement ? e.target : null
}

export function useKeyboardShortcuts(onAction: (action: ShortcutAction) => void): void {
  // 리스너는 한 번만 등록하고, 매 렌더링의 최신 처리 함수는 ref로 읽는다
  const onActionRef = useRef(onAction)
  useEffect(() => {
    onActionRef.current = onAction
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const action = shortcutAction(e, isTextEntry(targetElement(e)))
      if (!action) return
      if (action.type === 'stop' || action.type === 'focusSearch') e.preventDefault()
      onActionRef.current(action)
    }
    function onKeyUp(e: KeyboardEvent) {
      // 포커스가 남은 버튼은 Space의 keyup에서 눌려, 정지 직후 같은 곡이 다시 시작될 수 있다 [R-06]
      if (e.code === 'Space' && targetElement(e)?.tagName === 'BUTTON') e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])
}
