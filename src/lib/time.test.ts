//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { formatTime, parseIsoDuration, parseTime } from './time.ts'

describe('parseTime', () => {
  it('MM:SS, M:SS, H:MM:SS를 초로 바꾼다', () => {
    expect(parseTime('04:15')).toBe(255)
    expect(parseTime('4:15')).toBe(255)
    expect(parseTime('1:04:38')).toBe(3878)
    expect(parseTime('00:00')).toBe(0)
  })

  it('앞뒤 공백을 무시하고 정수 초 문자열을 받는다', () => {
    expect(parseTime('  04:15 ')).toBe(255)
    expect(parseTime('90')).toBe(90)
    expect(parseTime(' 0 ')).toBe(0)
  })

  it('잘못된 값은 null이다', () => {
    for (const bad of ['', 'abc', '1:60', '1:75:00', '4:5', '-5', '1.5', '1:2:3:4', '12:']) {
      expect(parseTime(bad), bad).toBeNull()
    }
  })
})

describe('formatTime', () => {
  it('1시간 미만은 MM:SS, 이상은 H:MM:SS다', () => {
    expect(formatTime(255)).toBe('04:15')
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(3599)).toBe('59:59')
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3878)).toBe('1:04:38')
  })

  it('parseTime(formatTime(x)) === x', () => {
    for (const x of [0, 1, 59, 60, 255, 3599, 3600, 3878, 7325]) {
      expect(parseTime(formatTime(x))).toBe(x)
    }
  })
})

describe('parseIsoDuration', () => {
  it('PT#H#M#S 형식을 초로 바꾼다', () => {
    expect(parseIsoDuration('PT1H4M50S')).toBe(3890)
    expect(parseIsoDuration('PT4M5S')).toBe(245)
    expect(parseIsoDuration('PT1H')).toBe(3600)
    expect(parseIsoDuration('PT45S')).toBe(45)
    expect(parseIsoDuration('PT10M')).toBe(600)
  })

  it('라이브 영상의 P0D는 0이다', () => {
    expect(parseIsoDuration('P0D')).toBe(0)
  })

  it('알 수 없는 형식은 null이다', () => {
    for (const bad of ['', 'PT', 'P', '1:00', 'PT1.5S', 'P1DT1H', 'pt1h']) {
      expect(parseIsoDuration(bad)).toBeNull()
    }
  })
})
