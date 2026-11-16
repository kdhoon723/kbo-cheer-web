//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { keySeekTime, nextShownTime, pointerRatio, ratioOf, seekRange, seekTimeAt } from './progress.ts'

const seg = { start: 414, end: 475 }

describe('범위와 비율', () => {
  it('옮길 수 있는 범위는 시작 ~ 끝 2초 전', () => {
    expect(seekRange(seg)).toEqual({ min: 414, max: 473 })
    expect(seekRange({ start: 10, end: 11 })).toEqual({ min: 10, max: 10 })
  })

  it('시각 ↔ 비율, 누른 x → 비율', () => {
    expect(ratioOf(444.5, seg)).toBeCloseTo(0.5)
    expect(ratioOf(400, seg)).toBe(0)
    expect(ratioOf(500, seg)).toBe(1)
    expect(pointerRatio(150, 100, 200)).toBe(0.25)
    expect(pointerRatio(50, 100, 200)).toBe(0)
    expect(pointerRatio(400, 100, 200)).toBe(1)
    expect(pointerRatio(10, 0, 0)).toBe(0)
  })

  it('비율 → 옮길 시각은 범위 안으로', () => {
    expect(seekTimeAt(0.5, seg)).toBeCloseTo(444.5)
    expect(seekTimeAt(0, seg)).toBe(414)
    expect(seekTimeAt(1, seg)).toBe(473)
  })
})

describe('keySeekTime', () => {
  it.each([
    ['ArrowRight', 420, 425],
    ['ArrowLeft', 420, 415],
    ['ArrowLeft', 416, 414],
    ['ArrowRight', 471, 473],
    ['Home', 450, 414],
    ['End', 420, 473],
    ['Enter', 420, null],
  ])('%s(%d) → %j', (key, t, to) => {
    expect(keySeekTime(key, t, seg)).toBe(to)
  })
})

describe('nextShownTime', () => {
  const sample = { t: 420, at: 1000 }

  it('재생 중이면 흐른 시간을 더하고, 멈췄으면 받은 위치 그대로', () => {
    expect(nextShownTime(null, sample, 1500, true)).toBeCloseTo(420.5)
    expect(nextShownTime(null, sample, 1500, false)).toBe(420)
  })

  it('위치가 오래 멈추면(버퍼링) 0.6초 넘게 앞서 그리지 않는다', () => {
    expect(nextShownTime(null, sample, 4000, true)).toBeCloseTo(420.6)
  })

  it('조금 뒤로 온 값은 앞서 그린 값에 머문다', () => {
    expect(nextShownTime(420.3, { t: 420, at: 1000 }, 1000, true)).toBe(420.3)
  })

  it('1초 넘게 뒤면(옮기기) 따라간다', () => {
    expect(nextShownTime(450, { t: 420, at: 1000 }, 1000, true)).toBe(420)
  })
})
