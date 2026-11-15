//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { staggerDelay, teamSwitchDirection } from './motion.ts'

describe('teamSwitchDirection', () => {
  it('새 팀이 팀 순서에서 뒤쪽이면 1, 앞쪽이면 -1이다', () => {
    expect(teamSwitchDirection('kiwoom', 'hanwha')).toBe(1)
    expect(teamSwitchDirection('kt', 'kiwoom')).toBe(-1)
    expect(teamSwitchDirection('hanwha', 'samsung')).toBe(1)
  })

  it('두 팀을 오가면 늘 반대쪽에서 온다', () => {
    expect(teamSwitchDirection('hanwha', 'samsung')).toBe(-teamSwitchDirection('samsung', 'hanwha'))
  })

  it('같은 팀이면 0이다', () => {
    expect(teamSwitchDirection('lg', 'lg')).toBe(0)
  })
})

describe('staggerDelay', () => {
  it('줄마다 step만큼 늦어진다', () => {
    expect(staggerDelay(0, 24, 8)).toBe(0)
    expect(staggerDelay(1, 24, 8)).toBe(24)
    expect(staggerDelay(7, 24, 8)).toBe(168)
  })

  it('9번째 줄부터는 8번째 줄과 같이 움직인다', () => {
    expect(staggerDelay(8, 24, 8)).toBe(168)
    expect(staggerDelay(40, 24, 8)).toBe(168)
  })
})
