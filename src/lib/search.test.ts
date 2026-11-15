//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed-songs.json'
import type { Song } from '../types.ts'
import { searchSongs } from './search.ts'
import { parseSongsFile } from './songsFile.ts'

const parsed = parseSongsFile(seedJson, { allowEmpty: true })
if (!parsed.ok) throw new Error(parsed.error)
const songs: Song[] = parsed.songs

describe('searchSongs', () => {
  it('초성 검색으로 현재 팀 선수를 첫 결과로 찾는다', () => {
    const hits = searchSongs(songs, 'ㄴㅅㅎ', 'hanwha')
    expect(hits[0].song.title).toBe('노시환')
    expect(hits[0].team.id).toBe('hanwha')
  })

  it('이름 앞부분으로 찾는다', () => {
    expect(searchSongs(songs, '노시', 'hanwha')[0].song.title).toBe('노시환')
  })

  it('다른 팀 곡은 팀과 isCurrentTeam=false를 함께 돌려준다', () => {
    const hit = searchSongs(songs, '디아즈', 'hanwha').find((h) => h.song.title === '디아즈')
    expect(hit?.team.id).toBe('samsung')
    expect(hit?.isCurrentTeam).toBe(false)
  })

  it('현재 팀 결과가 다른 팀 결과보다 앞에 온다', () => {
    const hits = searchSongs(songs, 'ㅇ', 'kt')
    const firstOther = hits.findIndex((h) => !h.isCurrentTeam)
    expect(firstOther).toBeGreaterThan(0)
    expect(hits.slice(firstOther).every((h) => !h.isCurrentTeam)).toBe(true)
    expect(hits.slice(0, firstOther).every((h) => h.song.teamId === 'kt')).toBe(true)
  })

  it('빈 검색어와 공백만 있는 검색어는 결과가 없다', () => {
    expect(searchSongs(songs, '', 'kt')).toEqual([])
    expect(searchSongs(songs, '  ', 'kt')).toEqual([])
  })

  it('맞는 곡이 없으면 빈 배열', () => {
    expect(searchSongs(songs, '없는곡이름zzz', 'kt')).toEqual([])
  })

  it('대소문자와 공백을 무시한다', () => {
    expect(searchSongs(songs, 'thisisoursong', 'hanwha')[0].song.title).toBe('THIS IS OUR SONG')
    expect(searchSongs(songs, 'this is OUR song', 'hanwha')[0].song.title).toBe('THIS IS OUR SONG')
  })

  it('같은 팀 안에서는 앞부분 일치가 먼저, 그다음 order 순', () => {
    const mk = (id: string, title: string, order: number): Song => ({ ...songs[0], id, title, order, teamId: 'kt' })
    const list = [mk('a', '가나다', 0), mk('b', '다가나', 1), mk('c', '가라마', 2)]
    expect(searchSongs(list, '가', 'kt').map((h) => h.song.id)).toEqual(['a', 'c', 'b'])
  })
})
