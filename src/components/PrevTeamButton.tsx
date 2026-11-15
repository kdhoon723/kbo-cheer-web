//20241476-김도훈-(2026-11-15)
import { ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTeam } from '../data/teams.ts'
import { usePrefs } from '../context/PrefsContext.tsx'
import { TapButton } from '../ui/Press.tsx'
import TeamLogo from './TeamLogo.tsx'

export default function PrevTeamButton() {
  const navigate = useNavigate()
  const { teamState } = usePrefs()
  const prevId = teamState.prevTeamId

  return (
    <TapButton
      type="button"
      className="prev-team"
      aria-label={prevId ? `전 팀: ${getTeam(prevId).name}` : '전 팀'}
      disabled={prevId === null}
      onClick={() => prevId && navigate(`/team/${prevId}`)}
    >
      <ArrowLeftRight size={18} strokeWidth={1.75} aria-hidden="true" />
      {prevId && <TeamLogo teamId={prevId} size={28} />}
      <span className="prev-team-label">전 팀</span>
    </TapButton>
  )
}
