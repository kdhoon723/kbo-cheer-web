//20241476-김도훈-(2026-11-16)
import { TEAM_IDS } from '../data/teams.ts'
import type { CandidateRow, ImportCandidate, Song, SongKind, TeamId } from '../types.ts'

export type CandidateFilter = 'all' | 'new' | 'warning' | 'existing'

export const CANDIDATE_FILTERS: readonly { value: CandidateFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'new', label: '새 곡' },
  { value: 'warning', label: '경고' },
  { value: 'existing', label: '이미 있음' },
]

/** 이 팀에 이미 있는 곡이거나, 같은 제목 상황 곡이 있어 저장하지 않는 후보 */
export function isExistingCandidate(row: CandidateRow): boolean {
  return row.existing || row.duplicate
}

/** 시각이 앞뒤 줄과 맞지 않거나 이름이 틀려 사람이 봐야 하는 후보 */
export function hasCandidateWarning(row: CandidateRow): boolean {
  return row.warning !== null || row.titleError !== null
}

/** 새 곡: 이미 있지 않고 경고도 없는 후보. 경고 후보는 시각·이름을 고쳐야 새 곡인지 알 수 있다 */
export function matchesFilter(row: CandidateRow, filter: CandidateFilter): boolean {
  if (filter === 'new') return !isExistingCandidate(row) && !hasCandidateWarning(row)
  if (filter === 'warning') return hasCandidateWarning(row)
  if (filter === 'existing') return isExistingCandidate(row)
  return true
}

export function reviewCounts(rows: CandidateRow[]): Record<CandidateFilter, number> {
  return {
    all: rows.length,
    new: rows.filter((r) => matchesFilter(r, 'new')).length,
    warning: rows.filter((r) => matchesFilter(r, 'warning')).length,
    existing: rows.filter((r) => matchesFilter(r, 'existing')).length,
  }
}

/**
 * 보이는 후보를 한꺼번에 고르거나 푼다. 고를 수 없는 후보는 건드리지 않고,
 * 이미 있는 곡은 「전체 선택」에서 빠진다(같은 곡을 두 번 넣지 않게. 필요하면 하나씩 고른다)
 */
export function bulkSelection(rows: CandidateRow[], on: boolean): { key: number; selection: ImportCandidate['selection'] }[] {
  return rows
    .filter((r) => r.selectable && (!on || !r.existing))
    .map((r) => ({ key: r.key, selection: on ? 'on' : 'off' }))
}

const KIND_ORDER: SongKind[] = ['player', 'situation', 'team']

/** 저장한 곡이 있는 탭. 여러 종류면 선수 → 상황 → 팀 응원가 순으로 앞의 것 */
export function savedTab(kinds: SongKind[]): SongKind {
  return KIND_ORDER.find((k) => kinds.includes(k)) ?? 'player'
}

/** 처음 데이터에서 그 팀이 가장 많이 쓴 영상(처음 데이터를 만든 모음 영상). 곡이 없으면 null */
export function teamVideoId(seed: Song[], teamId: TeamId): string | null {
  const counts = new Map<string, number>()
  for (const s of seed) if (s.teamId === teamId) counts.set(s.videoId, (counts.get(s.videoId) ?? 0) + 1)
  let best: string | null = null
  for (const [id, n] of counts) if (best === null || n > (counts.get(best) ?? 0)) best = id
  return best
}

/** 백업 파일 미리 보기의 팀별 곡 수(곡이 있는 팀만, 팀 목록 순서) */
export function songsPerTeam(songs: Song[]): { teamId: TeamId; count: number }[] {
  return TEAM_IDS.map((teamId) => ({ teamId, count: songs.filter((s) => s.teamId === teamId).length })).filter(
    (t) => t.count > 0,
  )
}
