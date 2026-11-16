//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { findLyric, lyricsUrl, parseLyricsFile, sourceLabel } from './lyrics.ts'
import { makeSong } from './testSongs.ts'

const SOURCE = 'https://namu.wiki/w/%ED%95%9C%ED%99%94%20%EC%9D%B4%EA%B8%80%EC%8A%A4/%EC%9D%91%EC%9B%90%EA%B0%80#2.3'
const row = (start: number, extra: object = {}) => ({ videoId: 'abcdefghijk', start, kind: 'player', title: 'x', lyrics: '가사\n둘째 줄', source: SOURCE, ...extra })

describe('parseLyricsFile', () => {
  it('같은 팀 파일의 줄을 곡 열쇠로 읽는다', () => {
    const table = parseLyricsFile('hanwha', { teamId: 'hanwha', songs: [row(10)] })
    expect(findLyric(table, makeSong({ start: 10 }))).toEqual({ lyrics: '가사\n둘째 줄', source: SOURCE })
    expect(findLyric(table, makeSong({ start: 11 }))).toBeNull()
    expect(findLyric(table, makeSong({ start: 10, teamId: 'lg' }))).toBeNull()
  })

  it('형식이 틀린 줄과 https가 아닌 출처는 건너뛴다', () => {
    const table = parseLyricsFile('hanwha', {
      teamId: 'hanwha',
      songs: [row(1, { lyrics: '  ' }), row(2, { source: 'javascript:alert(1)' }), row(3, { source: 'http://a.b' }), row(4.5), null, row(5)],
    })
    expect([...table.keys()]).toEqual(['hanwha|abcdefghijk|5'])
  })

  it.each([[null], [[]], [{ teamId: 'lg', songs: [row(1)] }], [{ teamId: 'hanwha' }]])('구조가 틀리거나 다른 팀 파일이면 빈 표: %j', (x) => {
    expect(parseLyricsFile('hanwha', x).size).toBe(0)
  })
})

describe('sourceLabel', () => {
  it('나무위키 주소는 문서 경로를 풀어 쓴다', () => {
    expect(sourceLabel(SOURCE)).toBe('나무위키 「한화 이글스/응원가」')
  })

  it('다른 사이트는 사이트 주소, 주소가 아니면 그대로', () => {
    expect(sourceLabel('https://example.com/a/b')).toBe('example.com')
    expect(sourceLabel('문서')).toBe('문서')
  })
})

describe('lyricsUrl', () => {
  it('팀별 파일', () => {
    expect(lyricsUrl('kt')).toBe('/lyrics/kt.json')
  })
})
