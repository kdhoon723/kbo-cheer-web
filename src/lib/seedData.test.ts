//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { fillCheerStarts, songKey, upgradeSavedSongs } from './seedData.ts'
import { makeSong } from './testSongs.ts'

const seed = [
  makeSong({ id: 'p1', start: 10, end: 60, cheerStart: 30 }),
  makeSong({ id: 'p2', start: 60, end: 120, cheerStart: 80 }),
  makeSong({ id: 't1', kind: 'team', start: 120, end: 200 }),
]

describe('songKey', () => {
  it('팀·영상·시작으로 만든다', () => {
    expect(songKey(makeSong({ teamId: 'nc', videoId: 'v', start: 5 }))).toBe('nc|v|5')
  })
})

describe('fillCheerStarts', () => {
  it('비어 있는 선수곡만 채우고 id와 제목은 따지지 않는다', () => {
    const saved = [makeSong({ id: 'x', title: '고친 제목', start: 10, end: 60 }), makeSong({ id: 'y', start: 60, end: 120 })]
    expect(fillCheerStarts(saved, seed).map((s) => s.cheerStart)).toEqual([30, 80])
  })

  it('사용자가 정한 값은 처음 데이터와 달라도 그대로 둔다', () => {
    const saved = [makeSong({ start: 10, end: 60, cheerStart: 20 })]
    expect(fillCheerStarts(saved, seed)[0].cheerStart).toBe(20)
  })

  it('구간이 달라 처음 데이터 값이 구간 밖이면 채우지 않는다', () => {
    const saved = [makeSong({ start: 10, end: 25 })]
    expect(fillCheerStarts(saved, seed)[0].cheerStart).toBeNull()
  })

  it('다른 팀·다른 영상·선수곡이 아닌 곡은 채우지 않는다', () => {
    const saved = [
      makeSong({ start: 10, end: 60, teamId: 'lg' }),
      makeSong({ start: 10, end: 60, videoId: 'other' }),
      makeSong({ start: 10, end: 60, kind: 'situation' }),
    ]
    expect(fillCheerStarts(saved, seed).map((s) => s.cheerStart)).toEqual([null, null, null])
  })

  it('바뀌지 않은 곡은 같은 객체를 돌려준다', () => {
    const untouched = makeSong({ start: 300, end: 360 })
    expect(fillCheerStarts([untouched], seed)[0]).toBe(untouched)
  })
})

describe('upgradeSavedSongs', () => {
  // 처음 데이터: 한화(차례 1에 넣은 값)와 삼성(차례 2에 넣은 값)
  const seed2 = [
    makeSong({ id: 'h', teamId: 'hanwha', start: 10, end: 60, cheerStart: 30 }),
    makeSong({ id: 's1', teamId: 'samsung', start: 100, end: 160, cheerStart: 120 }),
    makeSong({ id: 's2', teamId: 'samsung', start: 200, end: 260, cheerStart: 230 }),
  ]
  const blank = seed2.map((s) => ({ ...s, cheerStart: null }))

  it('차례 0(예전 목록)이면 모든 팀을 채운다', () => {
    expect(upgradeSavedSongs(blank, seed2, 0).map((s) => s.cheerStart)).toEqual([30, 120, 230])
  })

  it('차례 1이면 삼성만 새로 채우고, 사용자가 지운 한화 값은 되살리지 않으며 사용자 값은 지킨다', () => {
    // 차례 1 목록: 한화는 채워졌다가 사용자가 지움, 삼성 s2는 사용자가 직접 정함
    const rev1 = [blank[0], blank[1], { ...blank[2], cheerStart: 210 }]
    expect(upgradeSavedSongs(rev1, seed2, 1).map((s) => s.cheerStart)).toEqual([null, 120, 210])
  })

  it('지금 차례(2)면 같은 배열을 돌려준다', () => {
    expect(upgradeSavedSongs(blank, seed2, 2)).toBe(blank)
  })

  it('only를 주면 그 곡의 처음 데이터 값만 쓴다', () => {
    expect(fillCheerStarts(blank, seed2, (s) => s.id === 's2').map((s) => s.cheerStart)).toEqual([null, null, 230])
  })
})
