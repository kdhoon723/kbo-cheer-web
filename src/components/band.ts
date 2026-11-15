//20241476-김도훈-(2026-11-16)
import type { CSSProperties } from 'react'
import { getTeam } from '../data/teams.ts'
import type { TeamId } from '../types.ts'

// 팀 색은 재생 중인 칸의 위쪽 띠와 플레이어 영역에만 쓴다
export function bandStyle(teamId: TeamId): CSSProperties {
  return { '--band': getTeam(teamId).color } as CSSProperties
}
