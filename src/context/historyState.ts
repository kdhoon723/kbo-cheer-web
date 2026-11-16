//20241476-김도훈-(2026-11-16)
import { createContext, useContext } from 'react'
import type { PlayHistory } from '../types.ts'

export interface HistoryContextValue {
  history: PlayHistory
  recordPlay: (songId: string) => void
}

export const HistoryContext = createContext<HistoryContextValue | null>(null)

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistory는 HistoryProvider 안에서만 쓸 수 있습니다')
  return ctx
}
