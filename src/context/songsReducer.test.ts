//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { makeSong } from '../lib/testSongs.ts'
import { songsReducer } from './songsReducer.ts'

const a = makeSong({ id: 'a' })
const b = makeSong({ id: 'b', order: 1 })
const state = { songs: [a, b] }

describe('songsReducer', () => {
  it('ADD_SONG는 끝에 붙인다', () => {
    const c = makeSong({ id: 'c', order: 2 })
    expect(songsReducer(state, { type: 'ADD_SONG', song: c }).songs).toEqual([a, b, c])
  })

  it('UPDATE_SONG은 같은 id만 바꾼다', () => {
    const edited = { ...b, title: '바뀜' }
    const next = songsReducer(state, { type: 'UPDATE_SONG', song: edited })
    expect(next.songs).toEqual([a, edited])
    expect(next.songs[0]).toBe(a)
  })

  it('DELETE_SONG은 같은 id만 지운다', () => {
    expect(songsReducer(state, { type: 'DELETE_SONG', id: 'a' }).songs).toEqual([b])
    expect(songsReducer(state, { type: 'DELETE_SONG', id: 'zzz' }).songs).toEqual([a, b])
  })

  it('IMPORT_SONGS는 여러 곡을 이어 붙인다', () => {
    const more = [makeSong({ id: 'c' }), makeSong({ id: 'd' })]
    expect(songsReducer(state, { type: 'IMPORT_SONGS', songs: more }).songs).toEqual([a, b, ...more])
  })

  it('REPLACE_ALL은 통째로 바꾼다', () => {
    const only = [makeSong({ id: 'z' })]
    expect(songsReducer(state, { type: 'REPLACE_ALL', songs: only }).songs).toEqual(only)
  })

  it('입력 상태를 바꾸지 않는다', () => {
    const input = { songs: [a, b] }
    const before = structuredClone(input)
    songsReducer(input, { type: 'DELETE_SONG', id: 'a' })
    songsReducer(input, { type: 'UPDATE_SONG', song: { ...a, title: 'x' } })
    songsReducer(input, { type: 'ADD_SONG', song: makeSong({ id: 'q' }) })
    songsReducer(input, { type: 'IMPORT_SONGS', songs: [makeSong({ id: 'r' })] })
    songsReducer(input, { type: 'REPLACE_ALL', songs: [] })
    expect(input).toEqual(before)
  })
})
