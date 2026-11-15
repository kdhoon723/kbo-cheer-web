//20241476-김도훈-(2026-11-15)
import type { ReactNode } from 'react'
import { CircleAlert, Info, LoaderCircle } from 'lucide-react'

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

const ICONS = {
  empty: null,
  loading: LoaderCircle,
  error: CircleAlert,
  info: Info,
} as const

export default function StatusMessage({ tone, children, action }: Props) {
  const Icon = ICONS[tone]
  return (
    <div className={`status-message status-${tone}`} role={ROLES[tone]}>
      {Icon && <Icon className="status-icon" size={20} strokeWidth={1.75} aria-hidden="true" />}
      <p className="status-text">{children}</p>
      {action}
    </div>
  )
}
