//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { buildRankIndex, sortTeamSongs } from './teamSongSort.ts'
import { makeSong } from './testSongs.ts'

const row = (start: number, rank: number) => ({ teamId: 'hanwha', videoId: 'abcdefghijk', start, title: 'x', rank })
const ranks = buildRankIndex([row(100, 2), row(200, 1), row(300, 3)])

const songs = [
  makeSong({ id: 'a', kind: 'team', title: '다 곡', start: 100, order: 0 }),
  makeSong({ id: 'b', kind: 'team', title: '가 곡', start: 200, order: 1 }),
  makeSong({ id: 'mine2', kind: 'team', title: '나 곡', start: 500, order: 4 }),
  makeSong({ id: 'c', kind: 'team', title: '라 곡', start: 300, order: 2 }),
  makeSong({ id: 'mine1', kind: 'team', title: '마 곡', start: 400, order: 3 }),
]
const ids = (list: { id: string }[]) => list.map((s) => s.id)

describe('buildRankIndex', () => {
  it('형식이 틀린 줄은 건너뛴다', () => {
    const index = buildRankIndex([row(1, 1), { ...row(2, 2), teamId: 'zzz' }, { ...row(3, 3), rank: 1.5 }, null, 'x'])
    expect([...index.keys()]).toEqual(['hanwha|abcdefghijk|1'])
  })

  it.each([[null], [{}], ['x']])('배열이 아니면 빈 목록: %j', (x) => {
    expect(buildRankIndex(x).size).toBe(0)
  })
})

describe('sortTeamSongs', () => {
  it('인기순: 순위대로, 순위가 없는 곡은 맨 아래에 영상 순', () => {
    expect(ids(sortTeamSongs(songs, 'popular', ranks))).toEqual(['b', 'a', 'c', 'mine1', 'mine2'])
  })

  it('가나다', () => {
    expect(ids(sortTeamSongs(songs, 'name', ranks))).toEqual(['b', 'mine2', 'a', 'c', 'mine1'])
  })

  it('영상 순은 order 순서', () => {
    expect(ids(sortTeamSongs(songs, 'video', ranks))).toEqual(['a', 'b', 'c', 'mine1', 'mine2'])
  })

  it('받은 배열을 바꾸지 않는다', () => {
    const copy = [...songs]
    sortTeamSongs(songs, 'popular', ranks)
    expect(songs).toEqual(copy)
  })
})
