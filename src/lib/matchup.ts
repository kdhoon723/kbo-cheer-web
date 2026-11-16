//20241476-김도훈-(2026-11-16)
import type { TeamId, TeamState } from '../types.ts'

/** 넓은 화면의 두 팀 열. 왼쪽은 URL의 팀(currentTeamId), 오른쪽은 prevTeamId다 */
export interface Matchup {
  current: TeamId
  prev: TeamId | null
}

export type Slot = keyof Matchup

/**
 * 화면에 놓을 두 팀. 저장된 팀 상태가 URL을 아직 따라오지 못한 렌더(검색 결과·뒤로 가기로 URL만 먼저 바뀐 때)에는
 * TeamLayout의 visitTeam이 곧 만들 상태를 미리 보여 줘서 오른쪽 열이 한 번 깜박이지 않게 한다
 */
export function matchupOf(urlTeamId: TeamId, state: TeamState): Matchup {
  if (state.currentTeamId === urlTeamId) return { current: urlTeamId, prev: state.prevTeamId }
  return { current: urlTeamId, prev: state.currentTeamId }
}

/**
 * 한 칸의 팀을 바꾼다. 다른 칸에 있는 팀을 고르면 두 칸이 자리를 바꾼다(「전 팀」과 같은 결과).
 * 비어 있는 오른쪽 칸에 왼쪽 팀을 고르면 바꿀 것이 없어 그대로 둔다
 */
export function assignTeam(state: TeamState, slot: Slot, teamId: TeamId): TeamState {
  const { currentTeamId: current, prevTeamId: prev } = state
  if (current === null) return slot === 'current' ? { currentTeamId: teamId, prevTeamId: null } : state
  if (slot === 'current') {
    if (teamId === current) return state
    return { currentTeamId: teamId, prevTeamId: teamId === prev ? current : prev }
  }
  if (teamId === prev) return state
  if (teamId === current) return prev === null ? state : { currentTeamId: prev, prevTeamId: current }
  return { currentTeamId: current, prevTeamId: teamId }
}

/** 상황 칸이 따를 팀. 마지막으로 누른 곡의 팀이 보이는 두 팀 중 하나면 그 팀, 아니면 왼쪽 팀이다 */
export function situationTeamOf(lastPicked: TeamId | null, shown: Matchup): TeamId {
  return lastPicked !== null && (lastPicked === shown.current || lastPicked === shown.prev) ? lastPicked : shown.current
}

/** 보이는 두 팀 밖의 곡을 틀면 그 팀으로 옮겨 간다(휴대폰의 다른 팀 검색 결과와 같은 규칙) */
export function leavesMatchup(teamId: TeamId, shown: Matchup): boolean {
  return teamId !== shown.current && teamId !== shown.prev
}
