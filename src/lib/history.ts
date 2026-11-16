//20241476-김도훈-(2026-11-16)
import type { PlayHistory, Song } from '../types.ts'
import { isRecord } from './songValidation.ts'

export const RECENT_LIMIT = 10

export const EMPTY_HISTORY: PlayHistory = { counts: {}, recent: [] }

/** 곡을 한 번 틀었을 때의 기록. 최근 곡은 새것이 앞에 오고 같은 곡은 한 번만 남는다 */
export function recordPlay(history: PlayHistory, songId: string): PlayHistory {
  return {
    counts: { ...history.counts, [songId]: (history.counts[songId] ?? 0) + 1 },
    recent: [songId, ...history.recent.filter((id) => id !== songId)].slice(0, RECENT_LIMIT),
  }
}

/** 지워진 곡의 id는 그리지 않는다. 기록 자체는 지우지 않아 곡을 다시 넣으면 횟수가 이어진다 */
export function recentSongs(history: PlayHistory, songs: Song[]): Song[] {
  const byId = new Map(songs.map((s) => [s.id, s]))
  const found: Song[] = []
  for (const id of history.recent) {
    const song = byId.get(id)
    if (song) found.push(song)
  }
  return found
}

/** 저장소에서 읽은 값을 검사한다. 구조가 틀리면 null, 잘못된 항목만 있으면 그 항목만 버린다 */
export function parseHistory(x: unknown): PlayHistory | null {
  if (!isRecord(x) || !isRecord(x.counts) || !Array.isArray(x.recent)) return null
  const counts: Record<string, number> = {}
  for (const [id, n] of Object.entries(x.counts)) {
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1) counts[id] = n
  }
  const recent: string[] = []
  const items: unknown[] = x.recent
  for (const id of items) {
    if (typeof id === 'string' && id !== '' && !recent.includes(id) && recent.length < RECENT_LIMIT) recent.push(id)
  }
  return { counts, recent }
}
