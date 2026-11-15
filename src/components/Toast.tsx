//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { useNotice } from '../context/NoticeContext.tsx'

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
      {visible && (
        <button
          type="button"
          className={`toast toast-${notice.tone}`}
          title="눌러서 닫기"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setHiddenId(notice.id)}
        >
          {notice.tone === 'error' && <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" />}
          <span className="toast-text">{notice.text}</span>
          <X className="toast-close" size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
