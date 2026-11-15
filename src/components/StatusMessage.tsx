//20241476-김도훈-(2026-11-15)
import type { ReactNode } from 'react'

type StatusTone = 'empty' | 'loading' | 'error' | 'info'

interface Props {
  tone: StatusTone
  children: ReactNode
  action?: ReactNode
}

const ROLES: Record<StatusTone, 'status' | 'alert' | undefined> = {
  empty: undefined,
  loading: 'status',
  error: 'alert',
  info: 'status',
}

export default function StatusMessage({ tone, children, action }: Props) {
  return (
    <div className={`status-message status-${tone}`} role={ROLES[tone]}>
      <p className="status-text">{children}</p>
      {action}
    </div>
  )
}
