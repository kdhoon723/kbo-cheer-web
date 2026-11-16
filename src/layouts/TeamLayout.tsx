//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { isTeamId } from '../data/teams.ts'
import { matchupOf } from '../lib/matchup.ts'
import { teamSwitchDirection } from '../lib/motion.ts'
import type { ColumnEnter, SwitchDirection } from '../lib/motion.ts'
import type { TeamId } from '../types.ts'

interface View {
  teamId: TeamId | null
  prevId: TeamId | null
  pathname: string
  enter: ColumnEnter
}

function directionOf(from: TeamId | null, to: TeamId | null): SwitchDirection {
  return from && to ? teamSwitchDirection(from, to) : 0
}

export default function TeamLayout() {
  const { teamId } = useParams()
  const { teamState, visitTeam } = usePrefs()
  const valid = isTeamId(teamId) ? teamId : null
  const prevId = valid ? matchupOf(valid, teamState).prev : null
  const { pathname } = useLocation()
  // Outlet이 팀마다 새로 만들어지므로 직전 팀은 이 레이아웃이 기억한다. 팀 안에서 화면만 바뀌면 방향은 0이다.
  // 넓은 화면의 오른쪽 열도 Outlet과 함께 새로 만들어지므로 그 열의 직전 팀도 여기서 기억한다
  const [view, setView] = useState<View>({ teamId: valid, prevId, pathname, enter: { current: 0, prev: 0 } })
  if (view.teamId !== valid || view.prevId !== prevId || view.pathname !== pathname) {
    setView({
      teamId: valid,
      prevId,
      pathname,
      enter: { current: directionOf(view.teamId, valid), prev: directionOf(view.prevId, prevId) },
    })
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
  return <Outlet key={valid} context={view.enter} />
}
