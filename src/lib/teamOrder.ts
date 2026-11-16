//20241476-김도훈-(2026-11-16)
import { TEAM_IDS, isTeamId } from '../data/teams.ts'
import type { TeamId } from '../types.ts'

/** 팀 고르기 로고 격자의 열 수(index.css .team-grid와 같다). 키보드 위·아래 옮기기가 이만큼 건너뛴다 */
export const TEAM_GRID_COLUMNS = 5

/** 터치에서 이만큼 누르고 있으면 끌기가 시작된다. 그보다 짧게 떼면 그 팀으로 바꾼다 */
export const LONG_PRESS_MS = 350

/** 길게 누르는 동안 손가락이 이보다 움직이면 끌기를 하지 않는다(누르려다 미끄러진 것으로 본다) */
export const TOUCH_SLOP_PX = 8

/** 마우스는 누른 채 이만큼 움직이면 끌기가 시작된다. 그 안에서 떼면 누르기다 */
export const MOUSE_DRAG_PX = 4

export function defaultTeamOrder(): TeamId[] {
  return [...TEAM_IDS]
}

/** 저장된 팀 순서는 10개 팀이 한 번씩 모두 있을 때만 쓰고, 아니면 처음 순서다 */
export function parseTeamOrder(x: unknown): TeamId[] {
  if (!Array.isArray(x) || x.length !== TEAM_IDS.length) return defaultTeamOrder()
  const items: unknown[] = x
  const order = items.filter(isTeamId)
  return order.length === TEAM_IDS.length && new Set(order).size === TEAM_IDS.length ? order : defaultTeamOrder()
}

export function isDefaultTeamOrder(order: readonly TeamId[]): boolean {
  return order.every((id, i) => id === TEAM_IDS[i])
}

/** from 자리의 팀을 빼서 to 자리에 넣는다. 같은 자리면 같은 배열을 돌려준다 */
export function moveTeam(order: TeamId[], from: number, to: number): TeamId[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return order
  const next = [...order]
  const [team] = next.splice(from, 1)
  next.splice(to, 0, team)
  return next
}

/** Alt+방향키로 옮길 자리. 왼쪽·오른쪽은 한 칸, 위·아래는 한 줄. 끝을 넘으면 null */
export function keyMoveTarget(index: number, key: string, count: number, columns = TEAM_GRID_COLUMNS): number | null {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key]
  if (step === undefined) return null
  const to = index + step
  return to >= 0 && to < count ? to : null
}
