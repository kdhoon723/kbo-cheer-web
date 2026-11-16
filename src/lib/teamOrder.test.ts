//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { TEAM_IDS } from '../data/teams.ts'
import { defaultTeamOrder, isDefaultTeamOrder, keyMoveTarget, moveTeam, parseTeamOrder } from './teamOrder.ts'

describe('parseTeamOrder', () => {
  it('10개 팀이 한 번씩 있으면 그 순서', () => {
    const reversed = [...TEAM_IDS].reverse()
    expect(parseTeamOrder(reversed)).toEqual(reversed)
  })

  it.each([
    ['빠진 팀', TEAM_IDS.slice(1)],
    ['겹친 팀', [...TEAM_IDS.slice(1), 'hanwha']],
    ['모르는 팀', [...TEAM_IDS.slice(1), 'zzz']],
    ['배열 아님', 'hanwha'],
    ['없음', undefined],
  ])('%s이면 처음 순서', (_name, x) => {
    expect(parseTeamOrder(x)).toEqual([...TEAM_IDS])
  })
})

describe('moveTeam', () => {
  const order = defaultTeamOrder()

  it('앞에서 뒤로, 뒤에서 앞으로 옮긴다', () => {
    expect(moveTeam(order, 1, 3).slice(0, 4)).toEqual(['kiwoom', 'lotte', 'ssg', 'hanwha'])
    expect(moveTeam(order, 9, 0)[0]).toBe('kt')
    expect(order).toEqual([...TEAM_IDS])
  })

  it('같은 자리나 범위 밖이면 같은 배열', () => {
    expect(moveTeam(order, 2, 2)).toBe(order)
    expect(moveTeam(order, 2, 10)).toBe(order)
    expect(moveTeam(order, -1, 0)).toBe(order)
  })
})

describe('keyMoveTarget', () => {
  it.each([
    [1, 'ArrowLeft', 0],
    [1, 'ArrowRight', 2],
    [1, 'ArrowDown', 6],
    [6, 'ArrowUp', 1],
    [0, 'ArrowLeft', null],
    [9, 'ArrowRight', null],
    [7, 'ArrowDown', null],
    [3, 'ArrowUp', null],
    [3, 'Enter', null],
  ])('%i에서 %s → %j', (index, key, to) => {
    expect(keyMoveTarget(index, key, 10)).toBe(to)
  })
})

describe('isDefaultTeamOrder', () => {
  it('처음 순서인지 본다', () => {
    expect(isDefaultTeamOrder(defaultTeamOrder())).toBe(true)
    expect(isDefaultTeamOrder(moveTeam(defaultTeamOrder(), 0, 1))).toBe(false)
  })
})
