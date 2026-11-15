//20241476-김도훈-(2026-11-16)
import { useEffect, useRef } from 'react'

/**
 * 첫 렌더에서는 false, 화면에 붙은 뒤의 렌더에서는 true. 처음에 있던 항목과 나중에 생긴 항목을 가를 때 쓴다.
 * 상태로 두면 붙자마자 한 번 더 그리게 되므로 ref로 둔다. 값이 바뀌어도 다시 그릴 필요가 없다
 */
export function useMounted(): boolean {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])
  return mounted.current
}
