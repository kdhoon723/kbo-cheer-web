//20241476-김도훈-(2026-11-16)
import { TEAM_IDS } from '../data/teams.ts'
import type { TeamId } from '../types.ts'

/** 새 팀이 팀 순서에서 오른쪽이면 1, 왼쪽이면 -1, 같은 팀이면 0 */
export type SwitchDirection = -1 | 0 | 1

export function teamSwitchDirection(from: TeamId, to: TeamId): SwitchDirection {
  const d = TEAM_IDS.indexOf(to) - TEAM_IDS.indexOf(from)
  return d > 0 ? 1 : d < 0 ? -1 : 0
}

/** rows번째 줄부터는 rows번째 줄과 함께 움직인다 */
export function staggerDelay(index: number, step: number, rows: number): number {
  return Math.min(Math.max(index, 0), rows - 1) * step
}
