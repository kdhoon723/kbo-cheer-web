//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import type { SongFormValues } from '../types.ts'
import { validateSongForm } from './songValidation.ts'

const base: SongFormValues = {
  title: ' 노시환 ',
  kind: 'player',
  startText: '01:00',
  endText: '02:00',
  cheerStartText: '',
}

describe('validateSongForm', () => {
  it('통과하면 이름을 다듬고 초로 바꾼다', () => {
    expect(validateSongForm(base, 300)).toEqual({
      ok: true,
      fields: { title: '노시환', kind: 'player', start: 60, end: 120, cheerStart: null },
    })
  })

  it('이름이 비었거나 30자를 넘으면 막는다', () => {
    const empty = validateSongForm({ ...base, title: '  ' }, 300)
    expect(empty.ok === false && empty.errors.title).toBeTruthy()
    const long = validateSongForm({ ...base, title: 'a'.repeat(31) }, 300)
    expect(long.ok === false && long.errors.title).toBeTruthy()
    expect(validateSongForm({ ...base, title: 'a'.repeat(30) }, 300).ok).toBe(true)
  })

  it('시작·끝 형식, 순서, 영상 길이를 검사한다', () => {
    const bad = validateSongForm({ ...base, startText: 'x', endText: '1:99' }, 300)
    expect(bad.ok === false && Object.keys(bad.errors).sort()).toEqual(['endText', 'startText'])
    const same = validateSongForm({ ...base, endText: '01:00' }, 300)
    expect(same.ok === false && same.errors.endText).toBeTruthy()
    const over = validateSongForm({ ...base, endText: '05:01' }, 300)
    expect(over.ok === false && over.errors.endText).toBeTruthy()
    expect(validateSongForm({ ...base, endText: '05:00' }, 300).ok).toBe(true)
  })

  it('응원가 시작은 선수 곡에서만, 시작과 끝 사이에서만 받는다', () => {
    const ok = validateSongForm({ ...base, cheerStartText: '01:30' }, 300)
    expect(ok.ok && ok.fields.cheerStart).toBe(90)
    for (const t of ['01:00', '02:00', '00:30', 'zz']) {
      const r = validateSongForm({ ...base, cheerStartText: t }, 300)
      expect(r.ok === false && r.errors.cheerStartText).toBeTruthy()
    }
  })

  it('선수 곡이 아니면 응원가 시작을 null로 만든다', () => {
    const r = validateSongForm({ ...base, kind: 'situation', cheerStartText: '01:30' }, 300)
    expect(r.ok && r.fields.cheerStart).toBeNull()
  })
})
