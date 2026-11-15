//20241476-김도훈-(2026-11-15)
import { Link } from 'react-router-dom'
import type { TeamId } from '../types.ts'

export default function EmptyState({ teamId }: { teamId: TeamId }) {
  return (
    <div className="empty-state">
      <p>이 팀에는 곡이 없습니다</p>
      <Link className="link-button" to={`/team/${teamId}/import`}>
        곡 가져오기
      </Link>
    </div>
  )
}
