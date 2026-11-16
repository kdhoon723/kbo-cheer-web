//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import type { PlayerInfo } from '../types.ts'
import { sortPlayerSongs } from './playerSort.ts'
import type { SortContext } from './playerSort.ts'
import { makeSong } from './testSongs.ts'

function info(name: string, plateAppearances: number | null): PlayerInfo {
  return { name, playerId: name, position: null, games: null, plateAppearances, photo: null, cutout: false }
}

const PA: Record<string, number | null> = { 다: 500, 가: 300, 나: 300, 라: null }
const songs = ['가', '나', '다', '라', '마', '바'].map((title, order) => makeSong({ id: title, title, order }))

function ctx(counts: Record<string, number> = {}): SortContext {
  return {
    // 마·바는 선수 정보와 이어지지 않은 곡이다
    playerOf: (song) => (song.title in PA ? info(song.title, PA[song.title] ?? null) : null),
    counts,
  }
}

const ids = (list: { id: string }[]) => list.map((s) => s.id)

describe('주전순', () => {
  it('타석 수가 많은 순, 같으면 가나다 순', () => {
    expect(ids(sortPlayerSongs(songs, 'starters', ctx())).slice(0, 3)).toEqual(['다', '가', '나'])
  })

  it('기록이 없거나 이어지지 않은 곡은 맨 아래에 가나다 순', () => {
    expect(ids(sortPlayerSongs(songs, 'starters', ctx()))).toEqual(['다', '가', '나', '라', '마', '바'])
  })

  it('받은 배열을 바꾸지 않는다', () => {
    const before = ids(songs)
    sortPlayerSongs(songs, 'starters', ctx())
    expect(ids(songs)).toEqual(before)
  })
})

describe('가나다', () => {
  it('이름 가나다 순이고 같은 이름은 원래 순서를 지킨다', () => {
    const twin = [makeSong({ id: 'x2', title: '가', order: 1 }), makeSong({ id: 'x1', title: '가', order: 0 })]
    expect(ids(sortPlayerSongs(twin, 'name', ctx()))).toEqual(['x1', 'x2'])
    expect(ids(sortPlayerSongs(songs, 'name', ctx()))).toEqual(['가', '나', '다', '라', '마', '바'])
  })
})

describe('자주 튼', () => {
  it('튼 횟수가 많은 순, 같으면 주전순', () => {
    expect(ids(sortPlayerSongs(songs, 'frequent', ctx({ 바: 3, 나: 1, 라: 1 })))).toEqual([
      '바',
      '나',
      '라',
      '다',
      '가',
      '마',
    ])
  })

  it('한 번도 안 틀었으면 주전순과 같다', () => {
    expect(ids(sortPlayerSongs(songs, 'frequent', ctx()))).toEqual(ids(sortPlayerSongs(songs, 'starters', ctx())))
  })
})
