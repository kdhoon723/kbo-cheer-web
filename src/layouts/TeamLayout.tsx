//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { isTeamId } from '../data/teams.ts'
import { teamSwitchDirection } from '../lib/motion.ts'
import type { SwitchDirection } from '../lib/motion.ts'
import type { TeamId } from '../types.ts'

interface View {
  teamId: TeamId | null
  pathname: string
  direction: SwitchDirection
}

export default function TeamLayout() {
  const { teamId } = useParams()
  const { visitTeam } = usePrefs()
  const valid = isTeamId(teamId) ? teamId : null
  const { pathname } = useLocation()
  // Outlet이 팀마다 새로 만들어지므로 직전 팀은 이 레이아웃이 기억한다. 팀 안에서 화면만 바뀌면 방향은 0이다
  const [view, setView] = useState<View>({ teamId: valid, pathname, direction: 0 })
  if (view.teamId !== valid || view.pathname !== pathname) {
    const direction = view.teamId && valid ? teamSwitchDirection(view.teamId, valid) : 0
    setView({ teamId: valid, pathname, direction })
  }

  useEffect(() => {
    if (valid) visitTeam(valid)
  }, [valid, visitTeam])

  if (!valid) {
    return (
      <StatusMessage
        tone="empty"
        action={
          <Link className="link-button" to="/">
            처음 화면으로
          </Link>
        }
      >
        팀을 찾을 수 없습니다
      </StatusMessage>
    )
  }
  return <Outlet key={valid} context={view.direction} />
}
