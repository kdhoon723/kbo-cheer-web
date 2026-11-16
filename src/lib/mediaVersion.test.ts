//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { mediaVersion, withVersion } from './mediaVersion.ts'

const file = (path: string, text: string) => ({ path, bytes: new TextEncoder().encode(text) })

describe('mediaVersion', () => {
  const files = [file('hanwha.json', '{"a":1}'), file('kt.json', '{"b":2}')]

  it('16진수 8자리이고, 같은 내용이면 같은 버전이다(넘겨준 순서와 상관없음)', () => {
    const v = mediaVersion(files)
    expect(v).toMatch(/^[0-9a-f]{8}$/)
    expect(mediaVersion([...files].reverse())).toBe(v)
  })

  it('내용이 한 글자만 바뀌어도, 이름이 바뀌어도, 파일이 늘어도 버전이 바뀐다', () => {
    const v = mediaVersion(files)
    expect(mediaVersion([file('hanwha.json', '{"a":2}'), files[1]])).not.toBe(v)
    expect(mediaVersion([file('lg.json', '{"a":1}'), files[1]])).not.toBe(v)
    expect(mediaVersion([...files, file('lg.json', '')])).not.toBe(v)
  })

  it('경로와 내용의 경계가 달라도 구별한다', () => {
    expect(mediaVersion([file('ab', 'c')])).not.toBe(mediaVersion([file('a', 'bc')]))
  })
})

describe('withVersion', () => {
  it('버전이 있으면 ?v=를 붙이고 없으면 그대로', () => {
    expect(withVersion('/lyrics/hanwha.json', '0a1b2c3d')).toBe('/lyrics/hanwha.json?v=0a1b2c3d')
    expect(withVersion('/players/kt/1.webp', null)).toBe('/players/kt/1.webp')
  })
})
