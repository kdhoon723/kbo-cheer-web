//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { parsePlayers } from '../lib/players.ts'
import { parseSongsFile } from '../lib/songsFile.ts'
import { playerOf } from './players.ts'
import playersJson from './players-2026.json'
import seedJson from './seed-songs.json'
import { TEAM_IDS } from './teams.ts'

function seedPlayerSongs() {
  const parsed = parseSongsFile(seedJson, { allowEmpty: false })
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.songs.filter((s) => s.kind === 'player')
}

describe('선수 데이터(players-2026.json)', () => {
  it('모든 선수가 형식 검사를 통과한다', () => {
    const rawCount = Object.values(playersJson.teams).reduce((n, list) => n + list.length, 0)
    const parsed = parsePlayers(playersJson)
    expect(TEAM_IDS.reduce((n, id) => n + parsed[id].length, 0)).toBe(rawCount)
    expect(rawCount).toBe(596)
  })
})

describe('처음 데이터의 선수 곡 연결', () => {
  const songs = seedPlayerSongs()
  const linked = songs.filter((s) => playerOf(s) !== null)

  it('선수 곡 235곡이 모두 선수 정보와 이어지고, 사진·누끼·기록 수가 확정한 값과 같다', () => {
    expect(songs).toHaveLength(235)
    expect(linked).toHaveLength(235)
    expect(linked.filter((s) => playerOf(s)?.photo !== null)).toHaveLength(235)
    expect(linked.filter((s) => playerOf(s)?.cutout)).toHaveLength(173)
    expect(linked.filter((s) => playerOf(s)?.plateAppearances !== null)).toHaveLength(229)
  })

  it('선수 곡이 아닌 곡은 이어지지 않는다', () => {
    const parsed = parseSongsFile(seedJson, { allowEmpty: false })
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.songs.filter((s) => s.kind !== 'player').some((s) => playerOf(s) !== null)).toBe(false)
  })
})
