//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { EMPTY_HISTORY, RECENT_LIMIT, parseHistory, recentSongs, recordPlay } from './history.ts'
import { makeSong } from './testSongs.ts'

describe('recordPlay', () => {
  it('횟수를 올리고 최근 곡 맨 앞에 둔다', () => {
    const h = recordPlay(recordPlay(EMPTY_HISTORY, 'a'), 'b')
    expect(h).toEqual({ counts: { a: 1, b: 1 }, recent: ['b', 'a'] })
  })

  it('같은 곡을 다시 틀면 횟수만 오르고 최근 곡에는 한 번만 남는다', () => {
    const h = recordPlay(recordPlay(recordPlay(EMPTY_HISTORY, 'a'), 'b'), 'a')
    expect(h).toEqual({ counts: { a: 2, b: 1 }, recent: ['a', 'b'] })
  })

  it(`최근 곡은 ${RECENT_LIMIT}개까지만 남기고 가장 오래된 것부터 뺀다`, () => {
    let h = EMPTY_HISTORY
    for (let i = 0; i < 12; i++) h = recordPlay(h, `s${i}`)
    expect(h.recent).toHaveLength(RECENT_LIMIT)
    expect(h.recent[0]).toBe('s11')
    expect(h.recent).not.toContain('s0')
    expect(h.counts.s0).toBe(1)
  })

  it('받은 기록을 바꾸지 않는다', () => {
    const before = { counts: { a: 1 }, recent: ['a'] }
    recordPlay(before, 'a')
    expect(before).toEqual({ counts: { a: 1 }, recent: ['a'] })
  })
})

describe('recentSongs', () => {
  const songs = [makeSong({ id: 'a' }), makeSong({ id: 'b' })]

  it('최근 순서를 지키고 지워진 곡의 id는 건너뛴다', () => {
    const h = { counts: {}, recent: ['b', 'gone', 'a'] }
    expect(recentSongs(h, songs).map((s) => s.id)).toEqual(['b', 'a'])
  })
})

describe('parseHistory', () => {
  it('잘못된 항목만 버린다', () => {
    const parsed = parseHistory({
      counts: { a: 3, b: 0, c: 1.5, d: '2', e: -1 },
      recent: ['x', 7, 'x', '', 'y'],
    })
    expect(parsed).toEqual({ counts: { a: 3 }, recent: ['x', 'y'] })
  })

  it('최근 곡이 한도를 넘으면 앞에서 한도만큼 자른다', () => {
    const recent = Array.from({ length: 15 }, (_, i) => `s${i}`)
    expect(parseHistory({ counts: {}, recent })?.recent).toEqual(recent.slice(0, RECENT_LIMIT))
  })

  it.each([[null], [[]], ['x'], [{ counts: [], recent: [] }], [{ counts: {}, recent: {} }]])(
    '구조가 틀리면 null: %j',
    (x) => {
      expect(parseHistory(x)).toBeNull()
    },
  )
})
