//20241476-김도훈-(2026-11-15)
import { Navigate } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext.tsx'
import TeamSelectPage from './TeamSelectPage.tsx'

export default function HomeRedirect() {
  const { teamState } = usePrefs()
  if (teamState.currentTeamId) return <Navigate to={`/team/${teamState.currentTeamId}`} replace />
  return <TeamSelectPage />
}
