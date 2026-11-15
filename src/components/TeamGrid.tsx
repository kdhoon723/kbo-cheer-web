//20241476-김도훈-(2026-11-16)
import { TEAMS } from '../data/teams.ts'
import type { TeamId } from '../types.ts'
import TeamLogo from './TeamLogo.tsx'

interface Props {
  currentTeamId: TeamId | null
  onPick: (teamId: TeamId) => void
}

export default function TeamGrid({ currentTeamId, onPick }: Props) {
  return (
    <div className="team-grid">
      {TEAMS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="team-cell"
          aria-current={t.id === currentTeamId ? 'true' : undefined}
          onClick={() => onPick(t.id)}
        >
          <TeamLogo teamId={t.id} size={44} />
          <span className="team-cell-name">{t.name}</span>
        </button>
      ))}
    </div>
  )
}
