//20241476-김도훈-(2026-11-15)
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEAMS, isTeamId } from '../data/teams.ts'
import type { TeamId } from '../types.ts'

export default function TeamPicker({ teamId }: { teamId: TeamId | null }) {
  const navigate = useNavigate()

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    if (isTeamId(next)) navigate(`/team/${next}`)
  }

  return (
    <select aria-label="팀 선택" value={teamId ?? ''} onChange={handleChange}>
      {teamId === null && (
        <option value="" disabled>
          팀 선택
        </option>
      )}
      {TEAMS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}
