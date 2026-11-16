//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed-songs.json'
import { TEAM_IDS } from '../data/teams.ts'
import type { Song, TeamId } from '../types.ts'
import v1 from './__fixtures__/lyrics-v1-songs.json'
import { findLyric, lyricKey, lyricsUrl, parseLyricsFile, sourceLabel } from './lyrics.ts'
import type { LyricTable } from './lyrics.ts'
import { songKey } from './seedData.ts'
import { parseSongsFile } from './songsFile.ts'
import { makeSong } from './testSongs.ts'

const NAMU = 'https://namu.wiki/w/%ED%95%9C%ED%99%94%20%EC%9D%B4%EA%B8%80%EC%8A%A4/%EC%9D%91%EC%9B%90%EA%B0%80#2.3'
const KT = 'https://www.ktwiz.co.kr/media/cheer'
const row = (kind: string, title: string, extra: object = {}) => ({
  kind,
  key: lyricKey(title),
  title,
  lyrics: '가사\n둘째 줄',
  source: NAMU,
  sourceName: '나무위키',
  ...extra,
})

function parsed(teamId: TeamId, x: unknown): LyricTable {
  const table = parseLyricsFile(teamId, x)
  if (!table) throw new Error('가사 파일을 읽지 못함')
  return table
}

describe('lyricKey', () => {
  it.each([
    ['Jump up Lions!', 'jumpuplions'],
    ['JUMP UP LIONS', 'jumpuplions'],
    ['순정 안타송', '순정안타송'],
    ['승리를 위하여 (2009~)', '승리를위하여2009'],
    ['[KT] 위닝 케이티?', 'kt위닝케이티'],
    ["We're the One·Go-Go, ‘Twins’", 'weretheonegogo‘twins'],
    ['（전각）괄호.', '전각괄호'],
  ])('%s → %s', (text, key) => {
    expect(lyricKey(text)).toBe(key)
  })
})

describe('parseLyricsFile와 findLyric', () => {
  it('선수 곡은 선수 이름, 상황·팀 응원가는 제목으로 같이 찾는다', () => {
    const table = parsed('hanwha', { teamId: 'hanwha', songs: [row('player', '노시환'), row('song', '불타는 태양')] })
    expect(findLyric(table, makeSong({ kind: 'player', title: '노시환' }))).toEqual({
      lyrics: '가사\n둘째 줄',
      source: NAMU,
      sourceKind: 'namuwiki',
    })
    // 다른 영상·시각으로 넣었거나 띄어쓰기가 달라도 같은 곡이다
    expect(findLyric(table, makeSong({ kind: 'team', title: '불타는태양', videoId: 'zzzzzzzzzzz', start: 999 }))).not.toBeNull()
    expect(findLyric(table, makeSong({ kind: 'situation', title: '불타는 태양' }))).not.toBeNull()
    // 선수와 그 밖은 서로 찾지 않는다
    expect(findLyric(table, makeSong({ kind: 'team', title: '노시환' }))).toBeNull()
    expect(findLyric(table, makeSong({ kind: 'player', title: '불타는 태양' }))).toBeNull()
  })

  it('구단 공식 사이트 출처를 읽는다', () => {
    const table = parsed('kt', { teamId: 'kt', songs: [row('song', '마법의 성', { source: KT, sourceName: '구단 공식 사이트' })] })
    expect(findLyric(table, { kind: 'team', title: '마법의 성' })?.sourceKind).toBe('official')
  })

  it('형식이 틀린 줄, https가 아닌 출처, 알 수 없는 구분·출처는 건너뛴다', () => {
    const table = parsed('hanwha', {
      teamId: 'hanwha',
      songs: [
        row('player', '가', { lyrics: '  ' }),
        row('player', '나', { source: 'javascript:alert(1)' }),
        row('player', '다', { source: 'http://a.b' }),
        row('team', '라'),
        row('song', '마', { sourceName: '블로그' }),
        row('song', '', { key: '' }),
        null,
        row('song', '바'),
      ],
    })
    expect([...table.keys()]).toEqual(['song|바'])
  })

  it.each([[null], [[]], [{ teamId: 'lg', songs: [row('song', '가')] }], [{ teamId: 'hanwha' }]])('구조가 틀리거나 다른 팀 파일이면 null(다시 받기): %j', (x) => {
    expect(parseLyricsFile('hanwha', x)).toBeNull()
  })

  it('예전 형식(녹음 기준, key 없음) 파일은 null이라 다시 받는다 [STEP 3-㉚]', () => {
    const old = { teamId: 'hanwha', songs: [{ videoId: 'abcdefghijk', start: 10, kind: 'player', title: '노시환', lyrics: '가사', source: NAMU }] }
    expect(parseLyricsFile('hanwha', old)).toBeNull()
  })

  it('곡이 없는 파일은 빈 표다(가사가 없는 팀)', () => {
    expect(parseLyricsFile('hanwha', { teamId: 'hanwha', songs: [] })?.size).toBe(0)
  })
})

describe('sourceLabel', () => {
  it('나무위키 주소는 문서 경로를 풀어 쓴다', () => {
    expect(sourceLabel({ source: NAMU, sourceKind: 'namuwiki' })).toBe('나무위키 「한화 이글스/응원가」')
  })

  it('구단 공식 사이트는 그 이름으로', () => {
    expect(sourceLabel({ source: KT, sourceKind: 'official' })).toBe('구단 공식 사이트')
  })
})

describe('lyricsUrl', () => {
  it('팀별 파일', () => {
    expect(lyricsUrl('kt')).toBe('/lyrics/kt.json')
  })
})

// 가사 파일은 저장소 밖이다. npm run media로 만든 media-build/lyrics가 있을 때만 돈다(없으면 빈 객체)
const LYRICS_FILES: Record<string, unknown> = import.meta.glob('../../media-build/lyrics/*.json', { eager: true, import: 'default' })

describe.skipIf(Object.keys(LYRICS_FILES).length === 0)('처음 데이터에 붙는 가사(media-build/lyrics)', () => {
  const parsed = parseSongsFile(seedJson, { allowEmpty: false })
  if (!parsed.ok) throw new Error('seed-songs.json 형식 오류')
  const seed: Song[] = parsed.songs
  const tables = new Map<TeamId, LyricTable>(
    TEAM_IDS.map((id) => [id, parseLyricsFile(id, LYRICS_FILES[`../../media-build/lyrics/${id}.json`]) ?? new Map()]),
  )
  const lyricOf = (s: Song) => findLyric(tables.get(s.teamId) ?? new Map(), s)

  it('가사 616곡을 모두 읽는다', () => {
    expect([...tables.values()].reduce((n, t) => n + t.size, 0)).toBe(616)
  })

  it('507곡 중 461곡에 붙는다(선수 218, 팀 응원가 210, 상황 33)', () => {
    const found = seed.filter((s) => lyricOf(s) !== null)
    const byKind = (kind: Song['kind']) => found.filter((s) => s.kind === kind).length
    expect(found).toHaveLength(461)
    expect([byKind('player'), byKind('team'), byKind('situation')]).toEqual([218, 210, 33])
  })

  it('예전(녹음 기준) 413곡은 모두 붙는다', () => {
    const bySongKey = new Map(seed.map((s) => [songKey(s), s]))
    expect(v1.keys).toHaveLength(413)
    const missing = v1.keys.filter((k) => {
      const s = bySongKey.get(k)
      return !s || lyricOf(s) === null
    })
    expect(missing).toEqual([])
  })

  it('KT는 구단 공식 사이트, 한화는 나무위키 가사가 있다', () => {
    const kt = seed.filter((s) => s.teamId === 'kt').map(lyricOf)
    const hanwha = seed.filter((s) => s.teamId === 'hanwha').map(lyricOf)
    expect(kt.some((l) => l?.sourceKind === 'official')).toBe(true)
    expect(hanwha.every((l) => l === null || l.sourceKind === 'namuwiki')).toBe(true)
  })
})
