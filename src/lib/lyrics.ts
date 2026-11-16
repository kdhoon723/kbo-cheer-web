//20241476-김도훈-(2026-11-16)
import type { Song, TeamId } from '../types.ts'
import { isRecord } from './songValidation.ts'

export const LYRICS_LICENSE = { name: 'CC BY-NC-SA 2.0 KR', url: 'https://creativecommons.org/licenses/by-nc-sa/2.0/kr/' }

/** 가사를 옮겨 온 곳. 구단 공식 사이트가 있으면 그것을, 없으면 나무위키를 쓴다 [STEP 3-㉘] */
export type LyricSourceKind = 'official' | 'namuwiki'

const SOURCE_NAMES: Record<string, LyricSourceKind> = { '구단 공식 사이트': 'official', 나무위키: 'namuwiki' }

export interface Lyric {
  lyrics: string
  /** 가사를 옮겨 온 문서 주소(https) */
  source: string
  sourceKind: LyricSourceKind
}

/** 가사 자료의 곡 구분. 선수 곡은 선수 이름, 그 밖(상황·팀 응원가)은 제목으로 같이 찾는다 */
type LyricKind = 'player' | 'song'

/** (구분, 열쇠) → 가사. 한 팀 파일을 읽은 결과다 */
export type LyricTable = ReadonlyMap<string, Lyric>

// 가사 자료(data/lyrics.json format 2)가 key를 만든 규칙과 같아야 한다
const KEY_IGNORED = /[\s()（）[\]!?,.~·\-'"’]/g

/** 이름·제목에서 공백과 ()（）[]!?,.~·-'"’를 빼고 소문자로. 「Jump up Lions!」와 「JUMP UP LIONS」가 같은 곡이 된다 */
export function lyricKey(text: string): string {
  return text.replace(KEY_IGNORED, '').toLowerCase()
}

const tableKey = (kind: LyricKind, key: string) => `${kind}|${key}`

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

/** 팀 가사 파일을 읽는다. 다른 팀 파일, 빈 가사, https가 아닌 출처, 알 수 없는 구분·출처는 건너뛴다 */
export function parseLyricsFile(teamId: TeamId, x: unknown): LyricTable {
  const table = new Map<string, Lyric>()
  if (!isRecord(x) || x.teamId !== teamId || !Array.isArray(x.songs)) return table
  const rows: unknown[] = x.songs
  for (const row of rows) {
    if (!isRecord(row)) continue
    const { kind, key, lyrics, source, sourceName } = row
    if ((kind !== 'player' && kind !== 'song') || typeof key !== 'string' || key === '') continue
    if (typeof lyrics !== 'string' || lyrics.trim() === '' || typeof source !== 'string' || !isHttpsUrl(source)) continue
    const sourceKind = typeof sourceName === 'string' ? SOURCE_NAMES[sourceName] : undefined
    if (!sourceKind) continue
    table.set(tableKey(kind, key), { lyrics: lyrics.trim(), source, sourceKind })
  }
  return table
}

/** 곡의 종류와 이름(제목)으로 찾는다. 다른 영상으로 넣은 같은 곡, 이름을 고친 곡도 이름이 맞으면 붙는다 */
export function findLyric(table: LyricTable, song: Pick<Song, 'kind' | 'title'>): Lyric | null {
  return table.get(tableKey(song.kind === 'player' ? 'player' : 'song', lyricKey(song.title))) ?? null
}

/** 출처 링크 글자. 나무위키 문서는 「한화 이글스/응원가/선수」처럼 문서 경로를 풀어 쓰고, 구단 공식 사이트는 그렇게 쓴다 */
export function sourceLabel(lyric: Pick<Lyric, 'source' | 'sourceKind'>): string {
  if (lyric.sourceKind === 'official') return '구단 공식 사이트'
  try {
    const url = new URL(lyric.source)
    if (url.hostname === 'namu.wiki' && url.pathname.startsWith('/w/')) {
      return `나무위키 「${decodeURIComponent(url.pathname.slice(3))}」`
    }
    return url.hostname
  } catch {
    return lyric.source
  }
}
