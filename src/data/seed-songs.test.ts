//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { SONGS_KEY, loadSongs } from '../lib/storage.ts'
import { normalize } from '../lib/hangul.ts'
import { parseSongsFile } from '../lib/songsFile.ts'
import type { Song, SongKind, TeamId } from '../types.ts'
import { songKey } from '../lib/seedData.ts'
import { sortTeamSongs } from '../lib/teamSongSort.ts'
import seedJson from './seed-songs.json'
import ranksJson from './team-song-ranks.json'
import { TEAM_SONG_RANKS } from './teamSongRanks.ts'
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

  it('응원가 시작 지점은 선수곡 146곡에 있고 모두 시작과 끝 사이다', () => {
    const songs = loadSeed()
    const withCheer = songs.filter((s) => s.cheerStart !== null)
    expect(withCheer).toHaveLength(146)
    expect(withCheer.every((s) => s.kind === 'player')).toBe(true)
    for (const s of withCheer) {
      expect(s.cheerStart !== null && s.start < s.cheerStart && s.cheerStart < s.end, s.title).toBe(true)
    }
    const byTeam = Object.fromEntries(TEAM_IDS.map((t) => [t, withCheer.filter((s) => s.teamId === t).length]))
    expect(byTeam).toEqual({
      kiwoom: 18, hanwha: 10, lotte: 1, ssg: 17, doosan: 18, nc: 22, kia: 1, lg: 12, samsung: 26, kt: 21,
    })
    // 삼성에서 비어 있는 곡은 기준 녹음에 없던 두 곡뿐이다 [STEP 3-㉒]
    const samsungBlank = songs.filter((s) => s.teamId === 'samsung' && s.kind === 'player' && s.cheerStart === null)
    expect(samsungBlank.map((s) => s.title).sort()).toEqual(['김상준', '장승현'])
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

describe('팀 응원가 순위(team-song-ranks.json)', () => {
  const songs = loadSeed()

  it('223곡 모두 처음 데이터의 팀 응원가 하나와 제목까지 맞고 읽을 때 빠지는 줄이 없다', () => {
    expect(ranksJson).toHaveLength(223)
    expect(TEAM_SONG_RANKS.size).toBe(223)
    for (const r of ranksJson) {
      const hits = songs.filter((s) => s.kind === 'team' && songKey(s) === songKey(r))
      expect(hits.map((s) => s.title), r.title).toEqual([r.title])
    }
  })

  it('순위가 없는 처음 데이터 팀 응원가는 롯데 리듬 응원 송 하나다', () => {
    const unranked = songs.filter((s) => s.kind === 'team' && !TEAM_SONG_RANKS.has(songKey(s)))
    expect(unranked.map((s) => `${s.teamId} ${s.title}`)).toEqual(['lotte 리듬 응원 송'])
  })

  it('팀 안에서 순위가 겹치지 않는다', () => {
    for (const teamId of TEAM_IDS) {
      const list = ranksJson.filter((r) => r.teamId === teamId).map((r) => r.rank)
      expect(new Set(list).size, teamId).toBe(list.length)
    }
  })

  it.each([
    ['hanwha', ['내 사랑 한화 내 사랑 이글스', '행복송', '불타는 태양']],
    ['samsung', ['승리를 위해', '엘도라도', '승리의 라이온즈']],
  ] as const)('%s 인기순 1~3위가 순위 자료와 같다', (teamId, top3) => {
    const team = songs.filter((s) => s.teamId === teamId && s.kind === 'team')
    expect(sortTeamSongs(team, 'popular', TEAM_SONG_RANKS).slice(0, 3).map((s) => s.title)).toEqual(top3)
  })
})

describe('이미 저장한 브라우저의 응원가 시작 채우기 [STEP 3-㉒]', () => {
  it('차례 1 목록(120곡 채움 + 사용자가 지운 곡 하나)에서는 삼성 26곡만 새로 채우고 지운 곡은 그대로 둔다', () => {
    const seed = loadSeed()
    const cleared = seed.find((s) => s.teamId === 'nc' && s.title === '권희동')
    if (!cleared) throw new Error('권희동 없음')
    // 차례 1 때의 목록: 삼성은 아직 비어 있고, 사용자가 권희동 값을 지웠다
    const rev1 = seed.map((s) => (s.teamId === 'samsung' || s.id === cleared.id ? { ...s, cheerStart: null } : s))
    localStorage.setItem(SONGS_KEY, JSON.stringify({ version: 1, seedRevision: 1, songs: rev1 }))
    const { value, status } = loadSongs(seed)
    expect(status).toBe('ok')
    expect(value.filter((s) => s.teamId === 'samsung' && s.cheerStart !== null)).toHaveLength(26)
    expect(value.find((s) => s.id === cleared.id)?.cheerStart).toBeNull()
    expect(value.filter((s) => s.cheerStart !== null)).toHaveLength(145)
    localStorage.clear()
  })
})

