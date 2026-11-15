//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface Notice {
  id: number
  text: string
  tone: 'info' | 'error'
}

interface NoticeContextValue {
  notice: Notice | null
  notify: (text: string, tone?: Notice['tone']) => void
}

const NoticeContext = createContext<NoticeContextValue | null>(null)
let nextId = 1

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const notify = useCallback((text: string, tone: Notice['tone'] = 'info') => {
    setNotice({ id: nextId++, text, tone })
  }, [])
  const value = useMemo(() => ({ notice, notify }), [notice, notify])
  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>
}

export function useNotice(): NoticeContextValue {
  const ctx = useContext(NoticeContext)
  if (!ctx) throw new Error('useNotice는 NoticeProvider 안에서만 쓸 수 있습니다')
  return ctx
}
