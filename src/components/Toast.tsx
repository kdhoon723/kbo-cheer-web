//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
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
          <span className="toast-text">{notice.text}</span>
          <span className="toast-close" aria-hidden="true">
            ✕
          </span>
        </button>
      )}
    </div>
  )
}
