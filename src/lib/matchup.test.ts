//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import type { TeamState } from '../types.ts'
import { assignTeam, leavesMatchup, matchupOf, situationTeamOf } from './matchup.ts'

const state = (currentTeamId: TeamState['currentTeamId'], prevTeamId: TeamState['prevTeamId']) =>
  ({ currentTeamId, prevTeamId }) as TeamState

describe('matchupOf', () => {
  it('URL 팀이 저장된 지금 팀이면 저장된 두 팀을 그대로 쓴다', () => {
    expect(matchupOf('hanwha', state('hanwha', 'samsung'))).toEqual({ current: 'hanwha', prev: 'samsung' })
    expect(matchupOf('hanwha', state('hanwha', null))).toEqual({ current: 'hanwha', prev: null })
  })

  it('URL이 먼저 바뀐 렌더에서는 visitTeam이 만들 짝을 미리 보인다', () => {
    expect(matchupOf('kia', state('hanwha', 'samsung'))).toEqual({ current: 'kia', prev: 'hanwha' })
    expect(matchupOf('samsung', state('hanwha', 'samsung'))).toEqual({ current: 'samsung', prev: 'hanwha' })
    expect(matchupOf('kia', state(null, null))).toEqual({ current: 'kia', prev: null })
  })
})

describe('assignTeam', () => {
  const hs = state('hanwha', 'samsung')

  it('왼쪽 칸을 새 팀으로 바꾸면 오른쪽 칸은 그대로다', () => {
    expect(assignTeam(hs, 'current', 'kia')).toEqual(state('kia', 'samsung'))
  })

  it('오른쪽 칸을 새 팀으로 바꾸면 왼쪽 칸은 그대로다', () => {
    expect(assignTeam(hs, 'prev', 'kia')).toEqual(state('hanwha', 'kia'))
    expect(assignTeam(state('hanwha', null), 'prev', 'kia')).toEqual(state('hanwha', 'kia'))
  })

  it('다른 칸의 팀을 고르면 두 칸이 자리를 바꾼다', () => {
    expect(assignTeam(hs, 'current', 'samsung')).toEqual(state('samsung', 'hanwha'))
    expect(assignTeam(hs, 'prev', 'hanwha')).toEqual(state('samsung', 'hanwha'))
  })

  it('같은 팀을 고르거나 빈 오른쪽 칸에 왼쪽 팀을 고르면 바뀌지 않는다', () => {
    expect(assignTeam(hs, 'current', 'hanwha')).toBe(hs)
    expect(assignTeam(hs, 'prev', 'samsung')).toBe(hs)
    const alone = state('hanwha', null)
    expect(assignTeam(alone, 'prev', 'hanwha')).toBe(alone)
  })

  it('팀이 없던 상태에서는 왼쪽 칸만 정할 수 있다', () => {
    const none = state(null, null)
    expect(assignTeam(none, 'current', 'kia')).toEqual(state('kia', null))
    expect(assignTeam(none, 'prev', 'kia')).toBe(none)
  })
})

describe('situationTeamOf', () => {
  const shown = { current: 'hanwha', prev: 'samsung' } as const

  it('마지막으로 누른 곡의 팀이 보이는 팀이면 그 팀이다', () => {
    expect(situationTeamOf('samsung', shown)).toBe('samsung')
    expect(situationTeamOf('hanwha', shown)).toBe('hanwha')
  })

  it('누른 곡이 없거나 보이지 않는 팀이면 왼쪽 팀이다', () => {
    expect(situationTeamOf(null, shown)).toBe('hanwha')
    expect(situationTeamOf('kia', shown)).toBe('hanwha')
    expect(situationTeamOf('samsung', { current: 'hanwha', prev: null })).toBe('hanwha')
  })
})

describe('leavesMatchup', () => {
  it('보이는 두 팀 밖의 팀일 때만 참이다', () => {
    const shown = { current: 'hanwha', prev: 'samsung' } as const
    expect(leavesMatchup('hanwha', shown)).toBe(false)
    expect(leavesMatchup('samsung', shown)).toBe(false)
    expect(leavesMatchup('kia', shown)).toBe(true)
    expect(leavesMatchup('samsung', { current: 'hanwha', prev: null })).toBe(true)
  })
})
