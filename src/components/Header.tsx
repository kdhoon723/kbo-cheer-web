//20241476-김도훈-(2026-11-15)
import type { MouseEvent } from 'react'
import { NavLink } from 'react-router-dom'
import type { TeamId } from '../types.ts'
import PrevTeamButton from './PrevTeamButton.tsx'
import TeamPicker from './TeamPicker.tsx'

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

function closeMenu(e: MouseEvent<HTMLElement>) {
  e.currentTarget.closest('details')?.removeAttribute('open')
}

export default function Header({ teamId }: { teamId: TeamId | null }) {
  const links = () =>
    navItems(teamId).map((item) => (
      <NavLink key={item.to} to={item.to} end={item.end}>
        {item.label}
      </NavLink>
    ))

  return (
    <header className="app-header">
      <div className="header-row">
        <h1>KBO 응원가</h1>
        <TeamPicker teamId={teamId} />
        <PrevTeamButton />
        <details className="header-menu">
          <summary aria-label="메뉴">☰</summary>
          <nav onClick={closeMenu}>{links()}</nav>
        </details>
      </div>
      <nav className="header-nav">{links()}</nav>
    </header>
  )
}
