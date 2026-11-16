//20241476-김도훈-(2026-11-16)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { recordPlay as addPlay } from '../lib/history.ts'
import { loadHistory, saveHistory } from '../lib/storage.ts'
import type { PlayHistory } from '../types.ts'
import { HistoryContext } from './historyState.ts'
import { useNotice } from './NoticeContext.tsx'

const SAVE_FAILED = '튼 기록을 저장하지 못했습니다. 새로고침하면 횟수와 최근 곡이 이전 값으로 돌아갈 수 있습니다'

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotice()
  const [initial] = useState(() => loadHistory())
  const [history, setHistory] = useState<PlayHistory>(initial.value)
  // 저장소를 아예 쓸 수 없으면 곡 목록 쪽이 이미 알렸다. 실패는 다시 성공할 때까지 한 번만 알린다(EX-15)
  const saveFailing = useRef(initial.status === 'unavailable')

  useEffect(() => {
    if (saveHistory(history)) {
      saveFailing.current = false
    } else if (!saveFailing.current) {
      saveFailing.current = true
      notify(SAVE_FAILED, 'error')
    }
  }, [history, notify])

  const recordPlay = useCallback((songId: string) => setHistory((prev) => addPlay(prev, songId)), [])

  const value = useMemo(() => ({ history, recordPlay }), [history, recordPlay])
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}
