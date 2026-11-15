//20241476-김도훈-(2026-11-15)
import { useEffect } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { isTeamId } from '../data/teams.ts'

export default function TeamLayout() {
  const { teamId } = useParams()
  const { visitTeam } = usePrefs()
  const valid = isTeamId(teamId) ? teamId : null

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
  return <Outlet key={valid} />
}
