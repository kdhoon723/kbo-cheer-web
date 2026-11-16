//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import {
  cheerHereSecond,
  cheerTarget,
  isLeftoverStop,
  isStalePosition,
  pauseCause,
  playerErrorMessage,
  segmentElapsed,
} from './playback.ts'
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
  it('불러온 직후, 새 곡을 아직 재생하기 전에 온 정지 신호는 이전 로드에서 남은 것이다', () => {
    expect(isLeftoverStop(0, seg, 34, false)).toBe(true)
    expect(isLeftoverStop(1800, { end: 1900 }, 500, false)).toBe(true)
  })

  it('앞 챕터로 바꿀 때 이전 위치(구간 뒤)에서 온 정지 신호도 남은 것이다', () => {
    expect(isLeftoverStop(2000, { end: 200 }, 300, false)).toBe(true)
  })

  it('새 곡의 끝 시각 근처이거나 불러온 지 오래됐으면 진짜 정지다', () => {
    expect(isLeftoverStop(69.5, seg, 300, false)).toBe(false)
    expect(isLeftoverStop(30, seg, 1600, false)).toBe(false)
  })

  it('새 곡이 한 번 재생된 뒤의 정지는 불러온 직후라도 진짜 정지다(K-02)', () => {
    expect(isLeftoverStop(60.5, { end: 120 }, 800, true)).toBe(false)
  })
})

describe('segmentElapsed', () => {
  it('구간 시작부터 지난 초를 내림해서 돌려준다', () => {
    expect(segmentElapsed(seg, 10)).toBe(0)
    expect(segmentElapsed(seg, 22.9)).toBe(12)
    expect(segmentElapsed(seg, 70)).toBe(60)
  })

  it('구간 경계 1초 안쪽의 오차는 0과 구간 길이로 맞춘다', () => {
    expect(segmentElapsed(seg, 9.4)).toBe(0)
    expect(segmentElapsed(seg, 70.8)).toBe(60)
  })

  it('위치를 모르거나 구간에서 멀리 떨어진 이전 곡 위치는 0초다', () => {
    expect(segmentElapsed(seg, null)).toBe(0)
    expect(segmentElapsed(seg, 1800)).toBe(0)
    expect(segmentElapsed(seg, 3)).toBe(0)
  })
})

describe('pauseCause', () => {
  const seg = { end: 475 }

  it('앱이 멈춘 PAUSED는 다른 조건보다 먼저 app', () => {
    expect(pauseCause(true, 420, seg, 5000, true)).toBe('app')
    expect(pauseCause(true, 474.5, seg, 100, false)).toBe('app')
  })

  it('불러온 직후 이 곡 끝 근처가 아닌 PAUSED는 이전 로드에서 남은 신호', () => {
    expect(pauseCause(false, 200, seg, 300, false)).toBe('leftover')
  })

  it('끝 시각 1초 안에서 온 PAUSED는 끝', () => {
    expect(pauseCause(false, 474.2, seg, 5000, true)).toBe('end')
    expect(pauseCause(false, 475, seg, 5000, true)).toBe('end')
  })

  it('한 번 재생된 뒤 구간 중간의 PAUSED는 밖에서 멈춘 일시정지', () => {
    expect(pauseCause(false, 420, seg, 5000, true)).toBe('outside')
    // 불러온 지 1.5초 안이어도 이미 재생됐으면 진짜 일시정지다(K-02)
    expect(pauseCause(false, 416, seg, 800, true)).toBe('outside')
  })
})
