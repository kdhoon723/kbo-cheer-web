//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { isChosungOnly, toChosung } from './hangul.ts'

describe('toChosung', () => {
  it('완성형 한글을 초성으로 바꾼다', () => {
    expect(toChosung('노시환')).toBe('ㄴㅅㅎ')
  })
  it('영문과 숫자는 그대로 둔다', () => {
    expect(toChosung('KT위즈')).toBe('KTㅇㅈ')
    expect(toChosung('2번 타자')).toBe('2ㅂ ㅌㅈ')
  })
  it('쌍자음과 첫·끝 음절을 처리한다', () => {
    expect(toChosung('까치')).toBe('ㄲㅊ')
    expect(toChosung('가힣')).toBe('ㄱㅎ')
  })
  it('이미 자모인 글자는 바꾸지 않는다', () => {
    expect(toChosung('노ㅅ')).toBe('ㄴㅅ')
  })
})

describe('isChosungOnly', () => {
  it('초성만 있으면 true', () => {
    expect(isChosungOnly('ㄴㅅㅎ')).toBe(true)
  })
  it('빈 문자열은 false', () => {
    expect(isChosungOnly('')).toBe(false)
  })
  it('완성형이나 영문이 섞이면 false', () => {
    expect(isChosungOnly('노ㅅ')).toBe(false)
    expect(isChosungOnly('ㄴa')).toBe(false)
  })
})
