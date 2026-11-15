//20241476-김도훈-(2026-11-15)
import { useMatch } from 'react-router-dom'
import { getTeam, isTeamId } from '../data/teams.ts'
import { usePrefs } from '../context/PrefsContext.tsx'
import type { Team } from '../types.ts'

// URL의 팀을 먼저 쓴다. TeamLayout이 팀을 기록하기 전 한 프레임 동안 이전 팀이 보이는 것을 막는다
export function useActiveTeam(): Team | null {
  const match = useMatch('/team/:teamId/*')
  const { teamState } = usePrefs()
  const urlTeamId = match?.params.teamId
  if (isTeamId(urlTeamId)) return getTeam(urlTeamId)
  return teamState.currentTeamId ? getTeam(teamState.currentTeamId) : null
}
