//20241476-김도훈-(2026-11-16)
import { getTeam } from '../data/teams.ts'
import type { TeamId } from '../types.ts'
import TeamLogo from './TeamLogo.tsx'

interface Props {
  teams: readonly TeamId[]
  selected: TeamId
  panelId: string
  onSelect: (teamId: TeamId) => void
}

/** 넓은 화면에서 상황 칸이 어느 팀의 것인지 고르는 탭 */
export default function SituationTeamTabs({ teams, selected, panelId, onSelect }: Props) {
  return (
    <div className="tabs situation-tabs" role="tablist" aria-label="상황 칸 팀">
      {teams.map((teamId) => (
        <button
          key={teamId}
          type="button"
          role="tab"
          id={`situation-tab-${teamId}`}
          aria-selected={teamId === selected}
          aria-controls={panelId}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(teamId)}
        >
          <TeamLogo teamId={teamId} size={28} />
          {getTeam(teamId).name}
        </button>
      ))}
    </div>
  )
}
