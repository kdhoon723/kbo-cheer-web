//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getTeam } from '../data/teams.ts'
import type { TeamId } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import PrevTeamButton from './PrevTeamButton.tsx'
import TeamLogo from './TeamLogo.tsx'
import TeamSheet from './TeamSheet.tsx'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

// 화면은 응원과 곡 관리 둘뿐이라 접는 메뉴 없이 머리말에 바로 둔다. 휴대폰은 지금 화면이 아닌 쪽 하나만 보인다(index.css) [STEP 3-⑱]
function navItems(teamId: TeamId | null): NavItem[] {
  return teamId
    ? [
        { to: `/team/${teamId}`, label: '응원', end: true },
        { to: `/team/${teamId}/songs`, label: '곡 관리' },
      ]
    : []
}

export default function Header({ teamId }: { teamId: TeamId | null }) {
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)

  function pick(next: TeamId) {
    setSheetOpen(false)
    if (next !== teamId) navigate(`/team/${next}`)
  }

  return (
    <header className="app-header">
      <div className="header-row">
        {teamId ? (
          <TapButton
            type="button"
            className="team-trigger"
            aria-label={`팀 선택: ${getTeam(teamId).name}`}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <TeamLogo teamId={teamId} size={36} />
            <span className="team-trigger-name">{getTeam(teamId).name}</span>
            <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
          </TapButton>
        ) : (
          <h1 className="brand">KBO 응원가</h1>
        )}
        {/* 매치업 보드에서는 팀 버튼이 매치업 머리로 옮겨 가므로 이 자리에 앱 이름만 둔다 */}
        {teamId && <span className="brand board-brand">KBO 응원가</span>}
        <PrevTeamButton />
        <nav className="header-nav" aria-label="화면">
          {navItems(teamId).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {teamId && (
        <TeamSheet open={sheetOpen} currentTeamId={teamId} onClose={() => setSheetOpen(false)} onPick={pick} />
      )}
    </header>
  )
}
