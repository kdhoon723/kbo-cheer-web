//20241476-김도훈-(2026-11-15)
import { NavLink } from 'react-router-dom'
import type { TeamId } from '../types.ts'
import PrevTeamButton from './PrevTeamButton.tsx'
import TeamPicker from './TeamPicker.tsx'

export default function Header({ teamId }: { teamId: TeamId | null }) {
  return (
    <header className="app-header">
      <div className="header-row">
        <h1>KBO 응원가</h1>
        <TeamPicker teamId={teamId} />
        <PrevTeamButton />
      </div>
      <nav className="header-nav">
        {teamId && (
          <>
            <NavLink to={`/team/${teamId}`} end>
              응원
            </NavLink>
            <NavLink to={`/team/${teamId}/songs`}>곡 관리</NavLink>
            <NavLink to={`/team/${teamId}/import`}>가져오기</NavLink>
          </>
        )}
        <NavLink to="/settings">설정</NavLink>
      </nav>
    </header>
  )
}
