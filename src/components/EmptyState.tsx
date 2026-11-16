//20241476-김도훈-(2026-11-15)
import { Link } from 'react-router-dom'
import type { TeamId } from '../types.ts'
import StatusMessage from './StatusMessage.tsx'

export default function EmptyState({ teamId }: { teamId: TeamId }) {
  return (
    <StatusMessage
      tone="empty"
      action={
        <Link className="link-button" to={`/team/${teamId}/songs/add`}>
          곡 추가
        </Link>
      }
    >
      이 팀에는 곡이 없습니다
    </StatusMessage>
  )
}
