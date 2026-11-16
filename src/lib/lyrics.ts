//20241476-김도훈-(2026-11-16)
import type { Song, TeamId } from '../types.ts'
import { songKey } from './seedData.ts'
import { isRecord } from './songValidation.ts'

export const LYRICS_LICENSE = { name: 'CC BY-NC-SA 2.0 KR', url: 'https://creativecommons.org/licenses/by-nc-sa/2.0/kr/' }

export interface Lyric {
  lyrics: string
  /** 가사를 옮겨 온 문서 주소(https) */
  source: string
}

/** 곡 열쇠(songKey) → 가사. 한 팀 파일을 읽은 결과다 */
export type LyricTable = ReadonlyMap<string, Lyric>

export function lyricsUrl(teamId: TeamId): string {
  return `/lyrics/${teamId}.json`
}

function isHttpsUrl(x: string): boolean {
  try {
    return new URL(x).protocol === 'https:'
  } catch {
    return false
  }
}

/** 팀 가사 파일을 읽는다. 다른 팀 줄, 빈 가사, https가 아닌 출처는 건너뛴다 */
export function parseLyricsFile(teamId: TeamId, x: unknown): LyricTable {
  const table = new Map<string, Lyric>()
  if (!isRecord(x) || x.teamId !== teamId || !Array.isArray(x.songs)) return table
  const rows: unknown[] = x.songs
  for (const row of rows) {
    if (!isRecord(row)) continue
    const { videoId, start, lyrics, source } = row
    if (typeof videoId !== 'string' || typeof start !== 'number' || !Number.isInteger(start)) continue
    if (typeof lyrics !== 'string' || lyrics.trim() === '' || typeof source !== 'string' || !isHttpsUrl(source)) continue
    table.set(songKey({ teamId, videoId, start }), { lyrics: lyrics.trim(), source })
  }
  return table
}

export function findLyric(table: LyricTable, song: Song): Lyric | null {
  return table.get(songKey(song)) ?? null
}

/** 출처 링크 글자. 나무위키 문서는 「한화 이글스/응원가/선수」처럼 문서 경로를 풀어 쓰고, 그 밖은 사이트 주소만 쓴다 */
export function sourceLabel(source: string): string {
  try {
    const url = new URL(source)
    if (url.hostname === 'namu.wiki' && url.pathname.startsWith('/w/')) {
      return `나무위키 「${decodeURIComponent(url.pathname.slice(3))}」`
    }
    return url.hostname
  } catch {
    return source
  }
}
