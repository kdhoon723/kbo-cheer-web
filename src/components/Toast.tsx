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

  if (!notice || notice.id === hiddenId) return null
  return (
    <div className={`toast toast-${notice.tone}`} role="status" aria-live="polite">
      {notice.text}
    </div>
  )
}
