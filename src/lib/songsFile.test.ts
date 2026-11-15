//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed-songs.json'
import { createSongsFile, exportFileName, parseSongsFile, parseSongsFileText } from './songsFile.ts'
import { makeSong } from './testSongs.ts'

const songs = [makeSong({ id: 'a' }), makeSong({ id: 'b', teamId: 'lg', kind: 'team', title: '팀 응원가' })]

describe('songsFile', () => {
  it('만들고 문자열로 바꿔 다시 읽으면 같은 곡', () => {
    const file = createSongsFile(songs, new Date('2026-11-15T00:00:00Z'))
    expect(file.exportedAt).toBe('2026-11-15T00:00:00.000Z')
    const text = JSON.stringify(file, null, 2)
    expect(parseSongsFileText(text, { allowEmpty: false })).toEqual({ ok: true, songs })
  })

  it('JSON이 아니면 notJson', () => {
    expect(parseSongsFileText('nope', { allowEmpty: false })).toEqual({ ok: false, error: 'notJson' })
  })

  const base = createSongsFile(songs, new Date(0))
  it.each([
    ['format이 다름', { ...base, format: 'other' }],
    ['version이 다름', { ...base, version: 2 }],
    ['잘못된 곡', { ...base, songs: [makeSong({ title: '' })] }],
    ['id 중복', { ...base, songs: [makeSong(), makeSong()] }],
    ['객체가 아님', [1, 2]],
  ])('%s이면 badFormat', (_name, input) => {
    expect(parseSongsFile(input, { allowEmpty: false })).toEqual({ ok: false, error: 'badFormat' })
  })

  it('빈 목록은 allowEmpty에 따라 갈린다', () => {
    const empty = createSongsFile([], new Date(0))
    expect(parseSongsFile(empty, { allowEmpty: false })).toEqual({ ok: false, error: 'empty' })
    expect(parseSongsFile(empty, { allowEmpty: true })).toEqual({ ok: true, songs: [] })
  })

  it('seed-songs.json이 통과한다', () => {
    expect(parseSongsFile(seedJson, { allowEmpty: true }).ok).toBe(true)
  })

  it('내보내기 파일 이름은 로컬 날짜로 만든다', () => {
    expect(exportFileName(new Date(2026, 10, 5, 23, 59))).toBe('kbo-cheer-songs-20261105.json')
    expect(exportFileName(new Date(2026, 0, 1))).toBe('kbo-cheer-songs-20260101.json')
  })
})
