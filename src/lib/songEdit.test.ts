//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { isFormDirty, positionText, previewStart, segmentRatio, stepTimeText, youtubeAt } from './songEdit.ts'

const initial = { title: '노시환', kind: 'player' as const, startText: '06:54', endText: '07:55', cheerStartText: '07:25' }

describe('stepTimeText', () => {
  it('1초씩 옮기고 0과 영상 길이 안으로 자른다', () => {
    expect(stepTimeText('06:54', 1, 3600)).toBe('06:55')
    expect(stepTimeText('00:00', -1, 3600)).toBe('00:00')
    expect(stepTimeText('59:59', 1, 3599)).toBe('59:59')
    expect(stepTimeText('414', -1, 3600)).toBe('06:53')
  })

  it('읽을 수 없는 글자는 그대로', () => {
    expect(stepTimeText('7분', 1, 3600)).toBe('7분')
  })
})

describe('positionText', () => {
  it('재생 위치를 내림한 시각', () => {
    expect(positionText(445.92)).toBe('07:25')
    expect(positionText(-0.2)).toBe('00:00')
  })
})

describe('isFormDirty', () => {
  it('같은 값이면 false, 같은 시각의 다른 표기와 공백도 false', () => {
    expect(isFormDirty(initial, { ...initial })).toBe(false)
    expect(isFormDirty(initial, { ...initial, startText: '6:54', title: ' 노시환 ' })).toBe(false)
  })

  it('하나라도 바뀌면 true', () => {
    expect(isFormDirty(initial, { ...initial, endText: '07:56' })).toBe(true)
    expect(isFormDirty(initial, { ...initial, kind: 'situation', cheerStartText: '' })).toBe(true)
    expect(isFormDirty(initial, { ...initial, cheerStartText: '' })).toBe(true)
  })
})

describe('previewStart', () => {
  it('처음부터·응원가부터·끝 5초 전부터', () => {
    expect(previewStart('start', 414, 475, 445)).toBe(414)
    expect(previewStart('cheer', 414, 475, 445)).toBe(445)
    expect(previewStart('cheer', 414, 475, null)).toBeNull()
    expect(previewStart('last5', 414, 475, null)).toBe(470)
    expect(previewStart('last5', 414, 417, null)).toBe(414)
  })
})

describe('youtubeAt와 segmentRatio', () => {
  it('YouTube 주소와 막대 비율', () => {
    expect(youtubeAt('0OUzosfuD0s', 414.6)).toBe('https://www.youtube.com/watch?v=0OUzosfuD0s&t=414s')
    expect(segmentRatio(445, 414, 475)).toBeCloseTo(31 / 61)
    expect(segmentRatio(500, 414, 475)).toBe(1)
    expect(segmentRatio(10, 20, 20)).toBe(0)
  })
})
