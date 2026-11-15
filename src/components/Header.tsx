//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
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

export default function Header({ teamId }: { teamId: TeamId | null }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = () =>
    navItems(teamId).map((item) => (
      <NavLink key={item.to} to={item.to} end={item.end}>
        {item.label}
      </NavLink>
    ))

  return (
    <header className="app-header">
      <div className="header-row">
        <h1 className="brand">KBO 응원가</h1>
        <TeamPicker teamId={teamId} />
        <PrevTeamButton />
        <nav className="header-nav" aria-label="화면">
          {links()}
        </nav>
        <button
          type="button"
          className="menu-toggle"
          aria-label="메뉴"
          aria-expanded={menuOpen}
          aria-controls="header-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      {/* 휴대폰 메뉴는 플레이어를 덮지 않도록 머리말 아래로 펼쳐 내용을 밀어낸다 */}
      <nav id="header-menu" className="header-menu" aria-label="화면" hidden={!menuOpen} onClick={() => setMenuOpen(false)}>
        {links()}
      </nav>
    </header>
  )
}
