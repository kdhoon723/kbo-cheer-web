//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useNotice } from '../context/NoticeContext.tsx'
import { distance, quick, swap } from '../ui/motionTokens.ts'

const HIDE_MS = 4000

export default function Toast() {
  const { notice } = useNotice()
  const [hiddenId, setHiddenId] = useState<number | null>(null)
  const noticeId = notice?.id

  useEffect(() => {
    if (noticeId === undefined) return
    const timer = setTimeout(() => setHiddenId(noticeId), HIDE_MS)
    return () => clearTimeout(timer)
  }, [noticeId])

  const visible = notice !== null && notice.id !== hiddenId
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {/* 알림이 바뀌면 앞 알림이 사라진 뒤 새 알림이 올라와 둘이 겹치지 않는다 */}
      <AnimatePresence mode="wait">
        {visible && (
          <m.button
            key={notice.id}
            type="button"
            className={`toast toast-${notice.tone}`}
            initial={{ opacity: 0, y: distance.row }}
            animate={{ opacity: 1, y: 0, transition: swap }}
            exit={{ opacity: 0, transition: quick }}
            title="눌러서 닫기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHiddenId(notice.id)}
          >
            {notice.tone === 'error' && <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" />}
            <span className="toast-text">{notice.text}</span>
            <X className="toast-close" size={18} strokeWidth={1.75} aria-hidden="true" />
          </m.button>
        )}
      </AnimatePresence>
    </div>
  )
}
