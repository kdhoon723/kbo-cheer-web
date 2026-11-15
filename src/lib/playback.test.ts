//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { cheerHereSecond, cheerTarget, isLeftoverStop, isStalePosition, playerErrorMessage } from './playback.ts'
import { makeSong } from './testSongs.ts'

const seg = { songId: 'song-1', videoId: 'abcdefghijk', start: 10, end: 70 }

describe('playerErrorMessage', () => {
  it('오류 코드마다 원인 문구를 돌려준다', () => {
    expect(playerErrorMessage(2)).toBe('이 곡을 재생할 수 없습니다(영상 주소가 잘못됐습니다)')
    expect(playerErrorMessage(5)).toBe('이 곡을 재생할 수 없습니다(브라우저 재생 오류)')
    expect(playerErrorMessage(100)).toBe('이 곡을 재생할 수 없습니다(영상이 삭제됐거나 비공개입니다)')
    expect(playerErrorMessage(101)).toBe('이 곡을 재생할 수 없습니다(퍼가기가 막힌 영상입니다)')
    expect(playerErrorMessage(150)).toBe('이 곡을 재생할 수 없습니다(퍼가기가 막힌 영상입니다)')
    expect(playerErrorMessage(153)).toBe('재생 정보를 확인하지 못했습니다(페이지 설정 문제)')
  })

  it('목록에 없는 코드는 기본 문구다', () => {
    expect(playerErrorMessage(0)).toBe('이 곡을 재생할 수 없습니다')
    expect(playerErrorMessage(999)).toBe('이 곡을 재생할 수 없습니다')
  })
})

describe('cheerTarget', () => {
  it('선수 곡의 지점이 재생 구간 안이면 그 시각이다', () => {
    expect(cheerTarget(makeSong({ cheerStart: 40 }), seg)).toBe(40)
  })

  it('지점이 없거나, 선수 곡이 아니거나, 재생 중이 아니면 null이다', () => {
    expect(cheerTarget(makeSong({ cheerStart: null }), seg)).toBeNull()
    expect(cheerTarget(makeSong({ kind: 'team', cheerStart: 40 }), seg)).toBeNull()
    expect(cheerTarget(undefined, seg)).toBeNull()
    expect(cheerTarget(makeSong({ cheerStart: 40 }), null)).toBeNull()
  })

  it('재생 중에 지점을 구간 밖이나 경계로 고친 경우 null이다', () => {
    expect(cheerTarget(makeSong({ cheerStart: 10 }), seg)).toBeNull()
    expect(cheerTarget(makeSong({ cheerStart: 70 }), seg)).toBeNull()
    expect(cheerTarget(makeSong({ start: 80, end: 120, cheerStart: 90 }), seg)).toBeNull()
  })
})

describe('cheerHereSecond', () => {
  it('선수 곡의 구간 안이면 초 단위로 내림한다', () => {
    expect(cheerHereSecond(makeSong(), 42.9)).toBe(42)
  })

  it('구간 시작·끝과 같은 초, 선수 곡이 아님, 위치 모름은 null이다', () => {
    expect(cheerHereSecond(makeSong(), 10.5)).toBeNull()
    expect(cheerHereSecond(makeSong(), 70.2)).toBeNull()
    expect(cheerHereSecond(makeSong({ kind: 'situation' }), 42)).toBeNull()
    expect(cheerHereSecond(undefined, 42)).toBeNull()
    expect(cheerHereSecond(makeSong(), null)).toBeNull()
  })
})

describe('isStalePosition', () => {
  it('이동 직후 1.5초 동안 구간에서 1초 넘게 벗어난 위치는 이동 전 값으로 본다', () => {
    expect(isStalePosition(1800, seg, 300)).toBe(true)
    expect(isStalePosition(5, seg, 1499)).toBe(true)
  })

  it('구간 근처 위치나 1.5초가 지난 뒤의 위치는 그대로 쓴다', () => {
    expect(isStalePosition(9.5, seg, 300)).toBe(false)
    expect(isStalePosition(70.5, seg, 300)).toBe(false)
    expect(isStalePosition(1800, seg, 1500)).toBe(false)
  })
})

describe('isLeftoverStop', () => {
  it('불러온 직후 끝 시각과 먼 위치의 정지 신호는 이전 로드에서 남은 것이다', () => {
    expect(isLeftoverStop(0, seg, 34)).toBe(true)
    expect(isLeftoverStop(1800, { end: 1900 }, 500)).toBe(true)
  })

  it('끝 시각 근처이거나 불러온 지 오래됐으면 진짜 정지다', () => {
    expect(isLeftoverStop(69.5, seg, 300)).toBe(false)
    expect(isLeftoverStop(30, seg, 1600)).toBe(false)
  })
})
