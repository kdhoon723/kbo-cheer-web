//20241476-김도훈-(2026-11-15)
import { useEffect } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
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
      <section>
        <p>팀을 찾을 수 없습니다</p>
        <Link to="/">처음 화면으로</Link>
      </section>
    )
  }
  return <Outlet key={valid} />
}
