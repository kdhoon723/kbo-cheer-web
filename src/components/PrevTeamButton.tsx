//20241476-김도훈-(2026-11-15)
import { useNavigate } from 'react-router-dom'
import { getTeam } from '../data/teams.ts'
import { usePrefs } from '../context/PrefsContext.tsx'

export default function PrevTeamButton() {
  const navigate = useNavigate()
  const { teamState } = usePrefs()
  const prevId = teamState.prevTeamId

  return (
    <button type="button" disabled={prevId === null} onClick={() => prevId && navigate(`/team/${prevId}`)}>
      {prevId ? `⇄ ${getTeam(prevId).name}` : '⇄ 전 팀'}
    </button>
  )
}
