//20241476-김도훈-(2026-11-16)
import { isTeamId } from '../data/teams.ts'
import type { Song, TeamSongSort } from '../types.ts'
import { isRecord } from './songValidation.ts'
import { songKey } from './seedData.ts'

export const TEAM_SONG_SORTS: readonly { value: TeamSongSort; label: string }[] = [
  { value: 'popular', label: '인기순' },
  { value: 'name', label: '가나다' },
  { value: 'video', label: '영상 순' },
]

/** 곡 열쇠(songKey) → 구단 안 인기 순위(1이 가장 인기) */
export type RankIndex = ReadonlyMap<string, number>

/** 순위 파일을 읽는다. 형식이 틀린 줄은 건너뛴다 */
export function buildRankIndex(rows: unknown): RankIndex {
  const index = new Map<string, number>()
  if (!Array.isArray(rows)) return index
  for (const row of rows) {
    if (!isRecord(row)) continue
    const { teamId, videoId, start, rank } = row
    if (!isTeamId(teamId) || typeof videoId !== 'string') continue
    if (typeof start !== 'number' || !Number.isInteger(start) || typeof rank !== 'number' || !Number.isInteger(rank)) {
      continue
    }
    index.set(songKey({ teamId, videoId, start }), rank)
  }
  return index
}

const byVideo = (a: Song, b: Song) => a.order - b.order

/** 인기순은 순위가 있는 곡을 먼저, 순위가 없는 곡(직접 추가한 곡 등)은 맨 아래에 영상 순으로 둔다 */
export function sortTeamSongs(songs: Song[], sort: TeamSongSort, ranks: RankIndex): Song[] {
  if (sort === 'video') return [...songs].sort(byVideo)
  if (sort === 'name') return [...songs].sort((a, b) => a.title.localeCompare(b.title, 'ko') || byVideo(a, b))
  return [...songs].sort((a, b) => {
    const ra = ranks.get(songKey(a))
    const rb = ranks.get(songKey(b))
    if (ra !== undefined && rb !== undefined) return ra - rb || byVideo(a, b)
    if (ra !== undefined) return -1
    if (rb !== undefined) return 1
    return byVideo(a, b)
  })
}
