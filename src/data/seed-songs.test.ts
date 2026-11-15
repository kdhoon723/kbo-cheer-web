//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { normalize } from '../lib/hangul.ts'
import { parseSongsFile } from '../lib/songsFile.ts'
import type { Song, SongKind, TeamId } from '../types.ts'
import seedJson from './seed-songs.json'
import { TEAM_IDS } from './teams.ts'

const EXPECTED: Record<TeamId, Record<SongKind, number>> = {
  kiwoom: { player: 27, situation: 5, team: 17 },
  hanwha: { player: 22, situation: 4, team: 18 },
  lotte: { player: 22, situation: 6, team: 22 },
  ssg: { player: 24, situation: 6, team: 19 },
  doosan: { player: 24, situation: 5, team: 20 },
  nc: { player: 24, situation: 4, team: 29 },
  kia: { player: 25, situation: 4, team: 20 },
  lg: { player: 17, situation: 5, team: 22 },
  samsung: { player: 28, situation: 4, team: 27 },
  kt: { player: 22, situation: 5, team: 30 },
}

function loadSeed(): Song[] {
  const parsed = parseSongsFile(seedJson, { allowEmpty: false })
  if (!parsed.ok) throw new Error(`처음 데이터 형식 오류: ${parsed.error}`)
  return parsed.songs
}

describe('처음 데이터(seed-songs.json)', () => {
  it('형식 검사를 통과한다', () => {
    expect(parseSongsFile(seedJson, { allowEmpty: false }).ok).toBe(true)
  })

  it('팀별·종류별 곡 수가 확정한 분류와 같다', () => {
    const songs = loadSeed()
    for (const teamId of TEAM_IDS) {
      const teamSongs = songs.filter((s) => s.teamId === teamId)
      const counts = {
        player: teamSongs.filter((s) => s.kind === 'player').length,
        situation: teamSongs.filter((s) => s.kind === 'situation').length,
        team: teamSongs.filter((s) => s.kind === 'team').length,
      }
      expect(counts, teamId).toEqual(EXPECTED[teamId])
    }
    expect(songs.filter((s) => s.kind === 'player')).toHaveLength(235)
    expect(songs).toHaveLength(507)
  })

  it('두산 서울 두산 승리하리라는 40:36으로 고쳐져 있다', () => {
    const songs = loadSeed()
    const seoul = songs.find((s) => s.teamId === 'doosan' && s.title === '서울 두산 승리하리라')
    const champion = songs.find((s) => s.teamId === 'doosan' && s.title === '챔피언 두산')
    expect(seoul && [seoul.start, seoul.end]).toEqual([2436, 2525])
    expect(champion && [champion.start, champion.end]).toEqual([2355, 2436])
  })

  it('응원가 시작 지점은 모두 비어 있다', () => {
    expect(loadSeed().every((s) => s.cheerStart === null)).toBe(true)
  })

  it('팀마다 같은 제목의 상황 곡이 없다', () => {
    const songs = loadSeed()
    for (const teamId of TEAM_IDS) {
      const titles = songs
        .filter((s) => s.teamId === teamId && s.kind === 'situation')
        .map((s) => normalize(s.title))
      expect(new Set(titles).size, teamId).toBe(titles.length)
    }
  })

  it('구단 고유 곡은 팀 응원가이고 삼성 환희는 팀 응원가 하나만 있다', () => {
    const songs = loadSeed()
    const kindOf = (teamId: TeamId, title: string) =>
      songs.filter((s) => s.teamId === teamId && s.title === title).map((s) => s.kind)
    expect(kindOf('lotte', '리듬 응원 송')).toEqual(['team'])
    expect(kindOf('lotte', '시그널')).toEqual(['team'])
    expect(kindOf('ssg', "Let's GO")).toEqual(['team'])
    expect(kindOf('nc', '체로키')).toEqual(['team'])
    expect(kindOf('kia', '기아 없이는 못살아')).toEqual(['team'])
    expect(kindOf('lg', '셀리오')).toEqual(['team'])
    expect(kindOf('kt', '승리하리라 KT WIZ')).toEqual(['team'])
    expect(kindOf('samsung', '환희')).toEqual(['team'])
  })
})
