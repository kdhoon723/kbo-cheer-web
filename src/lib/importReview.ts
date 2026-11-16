//20241476-김도훈-(2026-11-16)
import { TEAM_IDS, getTeam } from '../data/teams.ts'
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

/**
 * 새 곡: 이미 있지 않고 경고도 없는 후보. 경고 후보는 시각·이름을 고쳐야 새 곡인지 알 수 있다.
 * 「이 팀 곡만」으로 볼 때 다른 구단 곡은 새 곡에도 이미 있음에도 들지 않는다(전체에만 보인다)
 */
export function matchesFilter(row: CandidateRow, filter: CandidateFilter): boolean {
  if (filter === 'new') return !row.otherTeam && !isExistingCandidate(row) && !hasCandidateWarning(row)
  if (filter === 'warning') return hasCandidateWarning(row)
  if (filter === 'existing') return !row.otherTeam && isExistingCandidate(row)
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

/** 종류 한꺼번에 바꾸기의 대상. 고른 곡(저장할 곡 전체) 또는 지금 필터에 보이는 곡 [STEP 3-㉖] */
export type KindScope = 'checked' | 'visible'

export function kindTargets(rows: CandidateRow[], visible: CandidateRow[], scope: KindScope): number[] {
  return (scope === 'checked' ? rows.filter((r) => r.willSave) : visible).map((r) => r.key)
}

/** 대상 후보의 종류만 바꾼다. 고른 상태(selection)는 그대로 두고, 판정은 다시 계산한다 */
export function withKind(candidates: ImportCandidate[], keys: readonly number[], kind: SongKind): ImportCandidate[] {
  const target = new Set(keys)
  return candidates.map((c) => (target.has(c.key) && c.kind !== kind ? { ...c, kind } : c))
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

export interface TeamCount {
  teamId: TeamId
  count: number
}

/** 팀별 곡 수(곡이 있는 팀만, 팀 목록 순서). 백업 파일 미리 보기, 여러 구단 영상 안내, 저장 알림에 쓴다 */
export function songsPerTeam(songs: readonly { teamId: TeamId }[]): TeamCount[] {
  return TEAM_IDS.map((teamId) => ({ teamId, count: songs.filter((s) => s.teamId === teamId).length })).filter(
    (t) => t.count > 0,
  )
}

/** 저장 뒤 알림. 여러 팀에 넣었으면 팀별 수를 붙인다 */
export function savedNotice(drafts: readonly { teamId: TeamId }[]): string {
  const teams = songsPerTeam(drafts)
  const head = `${drafts.length}곡을 저장했습니다`
  if (teams.length < 2) return head
  return `${head} · ${teams.map((t) => `${getTeam(t.teamId).name} ${t.count}`).join(' · ')}`
}

/** 가져온 곡의 순서. 팀마다 그 팀 마지막 곡 다음부터 차례로 붙인다(여러 팀을 한 번에 넣을 때도 팀 안에서 이어진다) */
export function importOrders(songs: readonly Song[], drafts: readonly { teamId: TeamId }[]): number[] {
  const next = new Map<TeamId, number>()
  for (const s of songs) next.set(s.teamId, Math.max(next.get(s.teamId) ?? 0, s.order + 1))
  return drafts.map((d) => {
    const order = next.get(d.teamId) ?? 0
    next.set(d.teamId, order + 1)
    return order
  })
}
