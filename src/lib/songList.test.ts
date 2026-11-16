//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { formatLength, isMissingCheer, listSearchOf, listSongs, listViewOf, parseTab, songListPath, songMeta } from './songList.ts'
import { makeSong } from './testSongs.ts'

const songs = [
  makeSong({ id: 'b', title: '노시환', start: 414, end: 475, cheerStart: 445, order: 1 }),
  makeSong({ id: 'a', title: '문현빈', start: 100, end: 160, order: 0 }),
  makeSong({ id: 'c', title: '강백호', start: 200, end: 260, order: 2 }),
  makeSong({ id: 's', title: '안타 송', kind: 'situation', start: 0, end: 30, order: 3 }),
]
const ids = (list: { id: string }[]) => list.map((s) => s.id)

describe('parseTab', () => {
  it.each([
    ['situation', 'situation'],
    ['team', 'team'],
    ['player', 'player'],
    [null, 'player'],
    ['x', 'player'],
  ])('%j → %s', (x, kind) => {
    expect(parseTab(x)).toBe(kind)
  })
})

describe('listViewOf와 listSearchOf', () => {
  it('주소와 고른 것을 서로 바꾸고 기본값은 적지 않는다', () => {
    const view = listViewOf(new URLSearchParams('tab=team&q=%EB%85%B8&missing=1'))
    expect(view).toEqual({ tab: 'team', q: '노', missing: false })
    expect(listSearchOf(view)).toBe('tab=team&q=%EB%85%B8')
    expect(listSearchOf({ tab: 'player', q: '', missing: true })).toBe('missing=1')
    expect(listSearchOf(listViewOf(new URLSearchParams('')))).toBe('')
  })
})

describe('songListPath', () => {
  it('검색어·필터는 두고 탭만 바꾼다. 선수 탭은 주소에서 뺀다', () => {
    expect(songListPath('hanwha', '?tab=team&q=%EB%85%B8', 'situation')).toBe('/team/hanwha/songs?tab=situation&q=%EB%85%B8')
    expect(songListPath('hanwha', 'tab=team&missing=1', 'player')).toBe('/team/hanwha/songs?missing=1')
    expect(songListPath('hanwha', '', 'player')).toBe('/team/hanwha/songs')
  })
})

describe('listSongs', () => {
  it('한 종류만 등록 순서로', () => {
    expect(ids(listSongs(songs, { kind: 'player', query: '', missingCheerOnly: false }))).toEqual(['a', 'b', 'c'])
    expect(ids(listSongs(songs, { kind: 'situation', query: '', missingCheerOnly: false }))).toEqual(['s'])
  })

  it('응원가 시작 없는 곡만', () => {
    expect(ids(listSongs(songs, { kind: 'player', query: '', missingCheerOnly: true }))).toEqual(['a', 'c'])
    // 선수 탭이 아니면 이 필터는 쓰지 않는다
    expect(ids(listSongs(songs, { kind: 'situation', query: '', missingCheerOnly: true }))).toEqual(['s'])
  })

  it('이름과 초성으로 거르고 다른 종류는 섞지 않는다', () => {
    expect(ids(listSongs(songs, { kind: 'player', query: 'ㄴㅅ', missingCheerOnly: false }))).toEqual(['b'])
    expect(ids(listSongs(songs, { kind: 'player', query: '안타', missingCheerOnly: false }))).toEqual([])
    expect(ids(listSongs(songs, { kind: 'player', query: '현', missingCheerOnly: true }))).toEqual(['a'])
  })

  it('곡이 없으면 빈 목록', () => {
    expect(listSongs([], { kind: 'player', query: '노', missingCheerOnly: false })).toEqual([])
  })
})

describe('songMeta', () => {
  it('선수 곡은 구간·길이·응원가', () => {
    expect(songMeta(songs[0])).toBe('06:54–07:55 · 1:01 · 응원가 07:25')
    expect(songMeta(songs[1])).toBe('01:40–02:40 · 1:00 · 응원가 시작 없음')
  })

  it('선수 곡이 아니면 구간과 길이만', () => {
    expect(songMeta(songs[3])).toBe('00:00–00:30 · 0:30')
  })

  it('formatLength와 isMissingCheer', () => {
    expect(formatLength(89)).toBe('1:29')
    expect(isMissingCheer(songs[1])).toBe(true)
    expect(isMissingCheer(songs[3])).toBe(false)
  })
})
