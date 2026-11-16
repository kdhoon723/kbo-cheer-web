//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { ChevronDown, Ellipsis, X } from 'lucide-react'
import { AnimatePresence, useReducedMotionConfig } from 'motion/react'
import * as m from 'motion/react-m'
import { NavLink, useNavigate } from 'react-router-dom'
import { getTeam } from '../data/teams.ts'
import type { TeamId } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import { distance, exit, spring, swap } from '../ui/motionTokens.ts'
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
  // 동작 줄이기에서는 옮기기가 순간 이동이 되므로 닫을 때는 사라지기만 한다
  const menuExitY = useReducedMotionConfig() ? {} : { y: -distance.row }
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
          {links()}
        </nav>
        <TapButton
          type="button"
          className="icon-btn menu-toggle"
          aria-label="메뉴"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? 'header-menu' : undefined}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <X size={22} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Ellipsis size={22} strokeWidth={1.75} aria-hidden="true" />
          )}
        </TapButton>
      </div>
      {/* 휴대폰 메뉴는 플레이어를 덮지 않도록 머리말 아래로 펼쳐 내용을 밀어낸다 */}
      <AnimatePresence>
        {menuOpen && (
          <m.nav
            id="header-menu"
            className="header-menu"
            aria-label="화면"
            onClick={() => setMenuOpen(false)}
            initial={{ opacity: 0, y: -distance.row }}
            animate={{ opacity: 1, y: 0, transition: { y: spring.sheet, opacity: swap } }}
            exit={{ opacity: 0, ...menuExitY, transition: exit }}
          >
            {links()}
          </m.nav>
        )}
      </AnimatePresence>
      {teamId && (
        <TeamSheet open={sheetOpen} currentTeamId={teamId} onClose={() => setSheetOpen(false)} onPick={pick} />
      )}
    </header>
  )
}
