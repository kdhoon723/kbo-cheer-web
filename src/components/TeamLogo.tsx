//20241476-김도훈-(2026-11-16)
import { useState } from 'react'
import { getTeam } from '../data/teams.ts'
import type { TeamId } from '../types.ts'

interface Props {
  teamId: TeamId
  /** 88은 선수 카드에서 선수 곡이 아닐 때만 쓴다 */
  size: 28 | 36 | 44 | 88
}

export default function TeamLogo({ teamId, size }: Props) {
  const [failedId, setFailedId] = useState<TeamId | null>(null)
  const team = getTeam(teamId)
  return (
    <span className={`logo-plate logo-${size}`} aria-hidden="true">
      {failedId === teamId ? (
        <span className="logo-fallback">{team.name}</span>
      ) : (
        <img src={`/teams/${teamId}.webp`} alt="" width={size} height={size} onError={() => setFailedId(teamId)} />
      )}
    </span>
  )
}
