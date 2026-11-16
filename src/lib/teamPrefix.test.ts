//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed-songs.json'
import type { ImportCandidate, Song, TeamId, VideoInfo } from '../types.ts'
import fixture from './__fixtures__/multi-team-description.json'
import { evaluateCandidates } from './candidates.ts'
import { parseDescription } from './chapterParser.ts'
import { kindTargets, matchesFilter, reviewCounts, savedNotice, withKind } from './importReview.ts'
import { parseSongsFile } from './songsFile.ts'
import { splitTeamPrefixes, teamPrefixOf } from './teamPrefix.ts'
import { makeSong } from './testSongs.ts'

const parsedSeed = parseSongsFile(seedJson, { allowEmpty: false })
if (!parsedSeed.ok) throw new Error('seed-songs.json 형식 오류')
const SEED: Song[] = parsedSeed.songs

const VIDEO: VideoInfo = {
  videoId: fixture.videoId,
  title: '',
  channelTitle: '',
  description: fixture.description,
  duration: fixture.duration,
  embeddable: true,
  ageRestricted: false,
}

function split(songs: Song[] = SEED): { candidates: ImportCandidate[]; teams: { teamId: TeamId; count: number }[] } {
  const r = splitTeamPrefixes(parseDescription(fixture.description), songs)
  if (!r) throw new Error('여러 구단 영상으로 알아보지 못함')
  return r
}

const scope = (split: boolean, songs: Song[] = SEED) => ({ teamId: 'samsung' as const, songs, split })
const samsungSongs = SEED.filter((s) => s.teamId === 'samsung')

describe('teamPrefixOf', () => {
  it('정식 이름, 줄인 이름, 별칭, 예전 이름을 알아본다', () => {
    expect(teamPrefixOf('두산 베어스 - 승리를 위하여')).toEqual({ teamId: 'doosan', rest: '승리를 위하여' })
    expect(teamPrefixOf('기아 - 두다')?.teamId).toBe('kia')
    expect(teamPrefixOf('KIA타이거즈 - 두다')?.teamId).toBe('kia')
    expect(teamPrefixOf('SK 와이번스 - 연안부두')?.teamId).toBe('ssg')
    expect(teamPrefixOf('kt wiz - 마법의 성')?.teamId).toBe('kt')
    expect(teamPrefixOf('KT 위즈 – 챔피언 KT')).toEqual({ teamId: 'kt', rest: '챔피언 KT' })
    expect(teamPrefixOf('넥센 - 영웅출정가')?.teamId).toBe('kiwoom')
  })

  it('구단 이름이 아니거나 구분 기호가 없으면 접두어가 아니다', () => {
    expect(teamPrefixOf('LG여 비상하라')).toBeNull()
    expect(teamPrefixOf('Dream - of Ground')).toBeNull()
    expect(teamPrefixOf('엘도라도')).toBeNull()
    expect(teamPrefixOf('삼성 라이온즈 -')).toBeNull()
  })
})

describe('splitTeamPrefixes: hWF7dU4-fQU 77곡', () => {
  it('이 영상 그대로는 77곡이 모두 상황이 된다(구분선도 등장곡 접미어도 없다)', () => {
    const parsed = parseDescription(fixture.description)
    expect(parsed).toHaveLength(77)
    expect(parsed.every((c) => c.kind === 'situation' && !c.inTeamSection)).toBe(true)
  })

  it('10개 구단 영상으로 알아보고 구단별 곡 수를 센다', () => {
    const { teams } = split()
    expect(teams).toEqual([
      { teamId: 'kiwoom', count: 8 },
      { teamId: 'hanwha', count: 7 },
      { teamId: 'lotte', count: 9 },
      { teamId: 'ssg', count: 8 },
      { teamId: 'doosan', count: 8 },
      { teamId: 'nc', count: 8 },
      { teamId: 'kia', count: 7 },
      { teamId: 'lg', count: 7 },
      { teamId: 'samsung', count: 8 },
      { teamId: 'kt', count: 7 },
    ])
  })

  it('이름에서 「<구단> - 」를 떼고, 선수·상황 이름이 아니면 팀 응원가로 본다', () => {
    const { candidates } = split()
    expect(candidates.slice(0, 3).map((c) => [c.teamId, c.title, c.kind])).toEqual([
      ['doosan', '승리를 위하여', 'team'],
      ['kia', '광주의 함성', 'team'],
      ['samsung', '엘도라도', 'team'],
    ])
    expect(candidates.every((c) => c.kind === 'team' && !/ - /.test(c.title))).toBe(true)
  })

  it('그 구단의 상황 곡·선수 곡과 이름이 같으면 그 종류로 둔다', () => {
    const songs = [
      makeSong({ teamId: 'samsung', kind: 'situation', title: '엘도라도' }),
      makeSong({ teamId: 'doosan', kind: 'player', title: '승리를 위하여' }),
    ]
    const { candidates } = split(songs)
    expect(candidates.find((c) => c.teamId === 'samsung' && c.title === '엘도라도')?.kind).toBe('situation')
    expect(candidates.find((c) => c.teamId === 'doosan' && c.title === '승리를 위하여')?.kind).toBe('player')
    // 다른 구단의 같은 이름은 영향이 없다
    expect(candidates.find((c) => c.teamId === 'kiwoom' && c.title === '승리를 위하여')?.kind).toBe('team')
  })

  it('구단이 하나뿐이거나 접두어 줄이 하나면 여러 구단 영상이 아니다', () => {
    expect(splitTeamPrefixes(parseDescription('00:00 삼성 - 엘도라도\n01:00 삼성 - 환희'), [])).toBeNull()
    expect(splitTeamPrefixes(parseDescription('00:00 두산 - 승리를 위하여\n01:00 볼넷 송'), [])).toBeNull()
  })

  it('등장곡 접미어로 선수가 된 곡은 선수로 둔다', () => {
    const r = splitTeamPrefixes(parseDescription('00:00 두산 - 홍길동 등장곡\n01:00 삼성 - 환희'), [])
    expect(r?.candidates.map((c) => [c.teamId, c.title, c.kind])).toEqual([
      ['doosan', '홍길동', 'player'],
      ['samsung', '환희', 'team'],
    ])
  })
})

describe('여러 구단 영상 판정', () => {
  it('(a) 이 팀 곡만: 삼성 곡만 고를 수 있고, 처음 데이터에 같은 이름 팀 응원가가 있는 7곡은 이미 있음이다', () => {
    const rows = evaluateCandidates(split().candidates, VIDEO, samsungSongs, scope(false))
    const own = rows.filter((r) => r.teamId === 'samsung')
    expect(own).toHaveLength(8)
    expect(rows.filter((r) => r.otherTeam)).toHaveLength(69)
    expect(rows.filter((r) => r.otherTeam).every((r) => !r.selectable && !r.willSave)).toBe(true)
    expect(own.filter((r) => r.existing).map((r) => r.title)).toHaveLength(7)
    expect(rows.filter((r) => r.willSave).map((r) => r.title)).toEqual(['빅토리 라이온즈'])
    expect(reviewCounts(rows)).toEqual({ all: 77, new: 1, warning: 0, existing: 7 })
  })

  it('(b) 구단별로 나눠 넣기: 곡마다 그 구단 곡과 견준다. 처음 데이터에 있는 60곡은 빠지고 17곡을 넣는다', () => {
    const rows = evaluateCandidates(split().candidates, VIDEO, samsungSongs, scope(true))
    expect(rows.some((r) => r.otherTeam)).toBe(false)
    expect(rows.filter((r) => r.existing)).toHaveLength(60)
    const saving = rows.filter((r) => r.willSave)
    expect(saving).toHaveLength(17)
    expect(saving.every((r) => r.kind === 'team')).toBe(true)
    // 키움 「승리를 위하여」는 키움에 있어 빠지고, NC 「승리를 위하여」는 NC에 없어 들어간다
    expect(rows.find((r) => r.teamId === 'kiwoom' && r.title === '승리를 위하여')?.existing).toBe(true)
    expect(rows.find((r) => r.teamId === 'nc' && r.title === '승리를 위하여')?.willSave).toBe(true)
  })

  it('같은 영상을 다시 넣으면 모두 이미 있음이다', () => {
    const first = evaluateCandidates(split([]).candidates, VIDEO, [], scope(true, []))
    const saved = first
      .filter((r) => r.willSave)
      .map((r, i) =>
        makeSong({ id: `s${i}`, teamId: r.teamId ?? 'samsung', kind: r.kind, title: `다른이름${i}`, videoId: VIDEO.videoId, start: r.start ?? 0 }),
      )
    expect(saved).toHaveLength(77)
    const again = evaluateCandidates(split([]).candidates, VIDEO, [], scope(true, saved))
    expect(again.every((r) => r.existing && !r.willSave)).toBe(true)
  })

  it('같은 이름 상황 곡 묶음은 구단마다 따로 센다', () => {
    const cs = split([]).candidates.map((c) => ({ ...c, kind: 'situation' as const }))
    const rows = evaluateCandidates(cs, VIDEO, [], scope(true, []))
    // 「승리를 위하여」는 두산·키움·NC에 하나씩이라 어느 것도 겹치지 않는다
    expect(rows.filter((r) => r.title === '승리를 위하여').every((r) => !r.duplicate)).toBe(true)
  })
})

describe('종류 한꺼번에 바꾸기', () => {
  it('고른 12곡만 선수로 바꾸고 판정을 다시 한다', () => {
    const base = split([]).candidates
    // 처음 12곡만 고르고 나머지는 푼다
    const picked = base.map((c, i) => ({ ...c, selection: i < 12 ? ('on' as const) : ('off' as const) }))
    const rows = evaluateCandidates(picked, VIDEO, [], scope(true, []))
    const keys = kindTargets(rows, rows, 'checked')
    expect(keys).toHaveLength(12)
    const changed = withKind(picked, keys, 'player')
    const after = evaluateCandidates(changed, VIDEO, [], scope(true, []))
    expect(after.filter((r) => r.kind === 'player').map((r) => r.key)).toEqual(keys)
    expect(after.filter((r) => r.kind !== 'player')).toHaveLength(65)
    expect(after.filter((r) => r.willSave)).toHaveLength(12)
  })

  it('보이는 곡 대상은 고를 수 없는 후보도 바꾼다. 상황으로 바꾸면 같은 이름 상황 곡 판정이 다시 생긴다', () => {
    const base = split([]).candidates
    const rows = evaluateCandidates(base, VIDEO, [], scope(false, []))
    const visible = rows.filter((r) => matchesFilter(r, 'all'))
    const changed = withKind(base, kindTargets(rows, visible, 'visible'), 'situation')
    const songs = [makeSong({ teamId: 'samsung', kind: 'situation', title: '환희' })]
    const after = evaluateCandidates(changed, VIDEO, songs, scope(false, songs))
    expect(after.every((r) => r.kind === 'situation')).toBe(true)
    expect(after.find((r) => r.teamId === 'samsung' && r.title === '환희')?.duplicate).toBe(true)
  })
})

describe('savedNotice', () => {
  it('한 팀이면 곡 수만, 여러 팀이면 팀별 수를 붙인다', () => {
    expect(savedNotice([{ teamId: 'hanwha' }, { teamId: 'hanwha' }])).toBe('2곡을 저장했습니다')
    expect(savedNotice([{ teamId: 'samsung' }, { teamId: 'doosan' }, { teamId: 'samsung' }])).toBe(
      '3곡을 저장했습니다 · 두산 1 · 삼성 2',
    )
  })
})
