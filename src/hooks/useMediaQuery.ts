//20241476-김도훈-(2026-11-16)
import { useEffect, useState } from 'react'

// CSS의 @media와 같은 값이어야 한다(index.css)
export const BOARD_QUERY = '(min-width: 1200px)'
export const NARROW_QUERY = '(max-width: 899.98px)'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}
