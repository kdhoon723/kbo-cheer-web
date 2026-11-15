//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { ChevronDown, Ellipsis, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getTeam } from '../data/teams.ts'
import type { TeamId } from '../types.ts'
import PrevTeamButton from './PrevTeamButton.tsx'
import TeamLogo from './TeamLogo.tsx'
import TeamSheet from './TeamSheet.tsx'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

function navItems(teamId: TeamId | null): NavItem[] {
  const team: NavItem[] = teamId
    ? [
        { to: `/team/${teamId}`, label: '응원', end: true },
        { to: `/team/${teamId}/songs`, label: '곡 관리' },
        { to: `/team/${teamId}/import`, label: '가져오기' },
      ]
    : []
  return [...team, { to: '/settings', label: '설정' }]
}

export default function Header({ teamId }: { teamId: TeamId | null }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const links = () =>
    navItems(teamId).map((item) => (
      <NavLink key={item.to} to={item.to} end={item.end}>
        {item.label}
      </NavLink>
    ))

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  function pick(next: TeamId) {
    setSheetOpen(false)
    if (next !== teamId) navigate(`/team/${next}`)
  }

  return (
    <header className="app-header">
      <div className="header-row">
        {teamId ? (
          <button
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
          </button>
        ) : (
          <h1 className="brand">KBO 응원가</h1>
        )}
        <PrevTeamButton />
        <nav className="header-nav" aria-label="화면">
          {links()}
        </nav>
        <button
          type="button"
          className="icon-btn menu-toggle"
          aria-label="메뉴"
          aria-expanded={menuOpen}
          aria-controls="header-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <X size={22} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Ellipsis size={22} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>
      {/* 휴대폰 메뉴는 플레이어를 덮지 않도록 머리말 아래로 펼쳐 내용을 밀어낸다 */}
      <nav id="header-menu" className="header-menu" aria-label="화면" hidden={!menuOpen} onClick={() => setMenuOpen(false)}>
        {links()}
      </nav>
      {teamId && (
        <TeamSheet open={sheetOpen} currentTeamId={teamId} onClose={() => setSheetOpen(false)} onPick={pick} />
      )}
    </header>
  )
}
