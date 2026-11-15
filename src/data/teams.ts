//20241476-김도훈-(2026-11-15)
import type { Team, TeamId } from '../types.ts'

export const TEAMS: readonly Team[] = [
  { id: 'kiwoom', name: '키움', fullName: '키움 히어로즈', color: '#820024', onColor: '#FFFFFF' },
  { id: 'hanwha', name: '한화', fullName: '한화 이글스', color: '#FF6600', onColor: '#000000' },
  { id: 'lotte', name: '롯데', fullName: '롯데 자이언츠', color: '#041E42', onColor: '#FFFFFF' },
  { id: 'ssg', name: 'SSG', fullName: 'SSG 랜더스', color: '#CE0E2D', onColor: '#FFFFFF' },
  { id: 'doosan', name: '두산', fullName: '두산 베어스', color: '#131230', onColor: '#FFFFFF' },
  { id: 'nc', name: 'NC', fullName: 'NC 다이노스', color: '#315288', onColor: '#FFFFFF' },
  { id: 'kia', name: 'KIA', fullName: 'KIA 타이거즈', color: '#EA0029', onColor: '#FFFFFF' },
  { id: 'lg', name: 'LG', fullName: 'LG 트윈스', color: '#C30452', onColor: '#FFFFFF' },
  { id: 'samsung', name: '삼성', fullName: '삼성 라이온즈', color: '#074CA1', onColor: '#FFFFFF' },
  { id: 'kt', name: 'KT', fullName: 'KT 위즈', color: '#000000', onColor: '#FFFFFF' },
]

export const TEAM_IDS: readonly TeamId[] = TEAMS.map((t) => t.id)

export function isTeamId(x: unknown): x is TeamId {
  return typeof x === 'string' && TEAM_IDS.some((id) => id === x)
}

export function getTeam(id: TeamId): Team {
  const team = TEAMS.find((t) => t.id === id)
  if (!team) throw new Error(`알 수 없는 팀: ${id}`)
  return team
}
