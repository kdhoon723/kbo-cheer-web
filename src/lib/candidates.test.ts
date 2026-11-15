//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import fixtureJson from './__fixtures__/descriptions.json'
import { parseDescription } from './chapterParser.ts'
import { evaluateCandidates } from './candidates.ts'
import { formatTime } from './time.ts'
import { makeSong } from './testSongs.ts'
import type { CandidateRow, ImportCandidate, Song, TeamId, VideoInfo } from '../types.ts'

interface Fixture {
  teamId: TeamId
  videoId: string
  duration: number
  description: string
}

function isFixture(v: unknown): v is Fixture {
  if (typeof v !== 'object' || v === null) return false
  return (
    'teamId' in v &&
    typeof v.teamId === 'string' &&
    'videoId' in v &&
    typeof v.videoId === 'string' &&
    'duration' in v &&
    typeof v.duration === 'number' &&
    'description' in v &&
    typeof v.description === 'string'
  )
}

function loadFixtures(raw: unknown): Fixture[] {
  if (!Array.isArray(raw) || !raw.every(isFixture)) throw new Error('fixture 형식 오류')
  return raw
}

const fixtures = loadFixtures(fixtureJson)

function videoOf(f: Pick<Fixture, 'videoId' | 'duration'>): VideoInfo {
  return {
    videoId: f.videoId,
    title: '',
    channelTitle: '',
    description: '',
    duration: f.duration,
    embeddable: true,
    ageRestricted: false,
  }
}

function fixtureOf(teamId: TeamId): Fixture {
  const f = fixtures.find((x) => x.teamId === teamId)
  if (!f) throw new Error(teamId)
  return f
}

function evaluate(f: Fixture, edit?: (c: ImportCandidate[]) => ImportCandidate[], songs: Song[] = []) {
  const parsed = parseDescription(f.description)
  return evaluateCandidates(edit ? edit(parsed) : parsed, videoOf(f), songs)
}

function withStart(c: ImportCandidate[], title: string, startText: string): ImportCandidate[] {
  return c.map((x) => (x.title === title ? { ...x, startText } : x))
}

function rowOf(rows: CandidateRow[], title: string, startText?: string): CandidateRow {
  const r = rows.find((x) => x.title === title && (startText === undefined || x.startText === startText))
  if (!r) throw new Error(title)
  return r
}

function saved(rows: CandidateRow[], kind: CandidateRow['kind']): number {
  return rows.filter((r) => r.kind === kind && r.willSave).length
}

const sim = (startText: string, title: string, over: Partial<ImportCandidate> = {}): ImportCandidate => ({
  key: 0,
  lineNo: 0,
  rawLine: '',
  inTeamSection: false,
  kind: 'situation',
  title,
  startText,
  selection: 'auto',
  ...over,
})

function simple(cs: ImportCandidate[], duration = 1000, songs: Song[] = []) {
  return evaluateCandidates(
    cs.map((c, i) => ({ ...c, key: i })),
    videoOf({ videoId: 'vvvvvvvvvvv', duration }),
    songs,
  )
}

describe('10개 영상 전체', () => {
  const expected: Record<TeamId, [number, number, number]> = {
    kiwoom: [27, 17, 5],
    hanwha: [22, 18, 4],
    lotte: [22, 20, 8],
    ssg: [24, 18, 7],
    doosan: [24, 19, 5],
    nc: [24, 28, 5],
    kia: [25, 19, 5],
    lg: [17, 21, 6],
    samsung: [28, 27, 5],
    kt: [22, 29, 6],
  }

  it('영상별 저장 대상 수가 프로토타입과 같다', () => {
    let players = 0
    for (const f of fixtures) {
      const rows = evaluate(f)
      const [p, t, s] = expected[f.teamId]
      expect([f.teamId, saved(rows, 'player'), saved(rows, 'team'), saved(rows, 'situation')]).toEqual([f.teamId, p, t, s])
      players += saved(rows, 'player')
    }
    expect(fixtures).toHaveLength(10)
    expect(players).toBe(235)
  })

  it('경고는 두산 30:36 한 줄뿐이다', () => {
    const warned = fixtures.flatMap((f) =>
      evaluate(f)
        .filter((r) => r.warning !== null)
        .map((r) => [f.teamId, r.title, r.startText, r.warning]),
    )
    expect(warned).toEqual([['doosan', '서울 두산 승리하리라', '30:36', 'timeReversed']])
  })
})

describe('두산 시각 수정', () => {
  const doosan = fixtureOf('doosan')

  it('30:36을 40:36으로 고치면 경고가 사라지고 끝 시각이 바뀐다', () => {
    const rows = evaluate(doosan, (c) => withStart(c, '서울 두산 승리하리라', '40:36'))
    expect(rows.filter((r) => r.warning !== null)).toEqual([])
    const champ = rowOf(rows, '챔피언 두산')
    expect([champ.start, champ.end]).toEqual([2355, 2436])
    expect(formatTime(2355)).toBe('39:15')
    const win = rowOf(rows, '서울 두산 승리하리라')
    expect([win.start, win.end]).toEqual([2436, 2525])
    expect(win.willSave).toBe(true)
  })

  it('챔피언 두산을 49:15로 잘못 적어도 그 두 줄만 경고한다', () => {
    const rows = evaluate(doosan, (c) => withStart(c, '챔피언 두산', '49:15'))
    expect(rows.filter((r) => r.warning !== null).map((r) => r.title).sort()).toEqual(
      ['서울 두산 승리하리라', '챔피언 두산'].sort(),
    )
    expect(rows.find((r) => r.startText === '42:05')?.warning).toBeNull()
  })
})

describe('키움 중복과 경계', () => {
  const kiwoom = fixtureOf('kiwoom')

  it('권혁빈은 11:14에 끝나고 두 번째 공통 안타 송은 중복이다', () => {
    const rows = evaluate(kiwoom)
    expect(rowOf(rows, '권혁빈').end).toBe(11 * 60 + 14)
    const hits = rows.filter((r) => r.title === '공통 안타 송')
    expect(hits.length).toBeGreaterThan(1)
    expect(hits[0].startText).toBe('04:36')
    expect(hits[0].duplicate).toBe(false)
    expect(hits[0].willSave).toBe(true)
    const second = rowOf(rows, '공통 안타 송', '11:14')
    expect(second.duplicate).toBe(true)
    expect(second.willSave).toBe(false)
  })
})

describe('시각 이상', () => {
  it('서로 엇갈리게 고치면 경고가 하나 남는다', () => {
    const rows = simple([sim('10:00', 'a'), sim('15:00', 'b'), sim('14:00', 'c'), sim('16:00', 'd')])
    expect(rows.filter((r) => r.warning === 'timeReversed')).toHaveLength(1)
  })

  it('같은 시각이면 경고가 하나 남는다', () => {
    const rows = simple([sim('01:00', 'a'), sim('01:00', 'b'), sim('02:00', 'c')])
    expect(rows.filter((r) => r.warning === 'timeReversed')).toHaveLength(1)
    expect(rows[0].warning).toBeNull()
    expect(rows[1].warning).toBe('timeReversed')
  })

  it('틀린 줄 하나가 뒤의 바른 줄을 경고로 만들지 않는다', () => {
    const rows = simple([sim('01:00', 'a'), sim('50:00', 'b'), sim('02:00', 'c'), sim('03:00', 'd')], 4000)
    expect(rows.map((r) => r.warning)).toEqual([null, 'timeReversed', null, null])
  })

  it('잘못된 시각은 badTime, 영상 길이 이상은 outOfRange다', () => {
    const rows = simple([sim('abc', 'a'), sim('01:00', 'b'), sim('01:40', 'c'), sim('09:00', 'd')], 100)
    expect(rows.map((r) => r.warning)).toEqual(['badTime', null, 'outOfRange', 'outOfRange'])
    expect(rows[0].start).toBeNull()
    expect(rows[0].end).toBeNull()
    expect(rows[0].willSave).toBe(false)
    expect(rows[1].end).toBe(100)
  })

  it('경고 줄은 끝 시각의 경계가 되지 않는다', () => {
    const rows = simple([sim('01:00', 'a'), sim('00:30', 'b'), sim('02:00', 'c')])
    expect(rows[1].warning).toBe('timeReversed')
    expect(rows[0].end).toBe(120)
  })
})

describe('이미 있음', () => {
  const f = fixtureOf('hanwha')
  const first = () => parseDescription(f.description).find((c) => c.kind === 'player')

  it('같은 영상과 시작 시각의 곡이 있으면 기본으로 저장하지 않는다', () => {
    const cand = first()
    if (!cand) throw new Error('후보 없음')
    const start = evaluate(f).find((r) => r.key === cand.key)?.start ?? -1
    const songs = [makeSong({ videoId: f.videoId, start, kind: 'player', title: '기존' })]
    const row = evaluate(f, undefined, songs).find((r) => r.key === cand.key)
    expect(row?.existing).toBe(true)
    expect(row?.willSave).toBe(false)

    const forced = evaluate(f, (c) => c.map((x) => (x.key === cand.key ? { ...x, selection: 'on' } : x)), songs)
    expect(forced.find((r) => r.key === cand.key)?.willSave).toBe(true)
  })

  it('시작 시각을 고치면 existing이 다시 계산된다', () => {
    const cand = first()
    if (!cand) throw new Error('후보 없음')
    const start = evaluate(f).find((r) => r.key === cand.key)?.start ?? -1
    const songs = [makeSong({ videoId: f.videoId, start })]
    const moved = evaluate(f, (c) => c.map((x) => (x.key === cand.key ? { ...x, startText: formatTime(start + 1) } : x)), songs)
    expect(moved.find((r) => r.key === cand.key)?.existing).toBe(false)
  })

  it('다른 영상의 같은 시각 곡은 이미 있음이 아니다', () => {
    const rows = simple([sim('01:00', 'a')], 1000, [makeSong({ videoId: 'zzzzzzzzzzz', start: 60 })])
    expect(rows[0].existing).toBe(false)
  })
})

describe('중복', () => {
  it('팀의 상황 곡 제목과 같으면 공백·대소문자와 무관하게 모두 중복이다', () => {
    const songs = [makeSong({ kind: 'situation', title: '볼넷 송', videoId: 'old' })]
    const rows = simple([sim('01:00', '볼넷송'), sim('02:00', '다른 곡')], 1000, songs)
    expect(rows[0].duplicate).toBe(true)
    expect(rows[0].willSave).toBe(false)
    expect(rows[1].duplicate).toBe(false)
    const eng = simple([sim('01:00', 'Hit Song')], 1000, [makeSong({ kind: 'situation', title: 'hitsong' })])
    expect(eng[0].duplicate).toBe(true)
  })

  it('팀의 선수 곡 제목은 상황 곡 중복에 영향이 없다', () => {
    const rows = simple([sim('01:00', '볼넷 송')], 1000, [makeSong({ kind: 'player', title: '볼넷 송' })])
    expect(rows[0].duplicate).toBe(false)
  })

  it('첫 같은 제목 줄에 경고가 있으면 첫 정상 줄이 대표가 된다', () => {
    const rows = simple([sim('xx', '볼넷 송'), sim('01:00', '볼넷송'), sim('02:00', '볼넷 송')])
    expect(rows.map((r) => r.duplicate)).toEqual([true, false, true])
    expect(rows[1].willSave).toBe(true)
  })

  it('모두 경고이면 첫 줄이 대표다', () => {
    const rows = simple([sim('xx', 'a'), sim('yy', 'a')])
    expect(rows.map((r) => r.duplicate)).toEqual([false, true])
  })

  it('종류와 이름을 바꿔 부딪히면 중복이 생긴다', () => {
    const base = [sim('01:00', '볼넷 송'), sim('02:00', '다른 곡'), sim('03:00', '선수', { kind: 'player' })]
    expect(simple(base).some((r) => r.duplicate)).toBe(false)
    const edited = base.map((c, i) => (i === 1 ? { ...c, title: '볼넷  송' } : c))
    expect(simple(edited).map((r) => r.duplicate)).toEqual([false, true, false])
    const kindChanged = base.map((c, i) => (i === 2 ? { ...c, kind: 'situation' as const, title: '볼넷 송' } : c))
    expect(simple(kindChanged).map((r) => r.duplicate)).toEqual([false, false, true])
  })

  it('이미 저장된 상황 곡도 같은 제목이 팀에 있으므로 다시 고를 수 없다(K-05)', () => {
    const songs = [makeSong({ videoId: 'vvvvvvvvvvv', start: 60, kind: 'situation', title: '볼넷 송' })]
    const rows = simple([sim('01:00', '볼넷 송', { selection: 'on' }), sim('02:00', '볼넷 송')], 1000, songs)
    expect(rows[0].existing).toBe(true)
    expect(rows[0].duplicate).toBe(true)
    expect(rows[0].willSave).toBe(false)
    expect(rows[1].duplicate).toBe(true)
  })

  it('이미 저장된 상황 곡의 제목을 팀에 없는 제목으로 고치면 고를 수 있다', () => {
    const songs = [makeSong({ videoId: 'vvvvvvvvvvv', start: 60, kind: 'situation', title: '볼넷 송' })]
    const rows = simple([sim('01:00', '볼넷 송 2', { selection: 'on' })], 1000, songs)
    expect(rows[0].existing).toBe(true)
    expect(rows[0].duplicate).toBe(false)
    expect(rows[0].willSave).toBe(true)
  })

  it('선수와 팀 곡은 같은 이름이어도 중복이 아니다', () => {
    const rows = simple([sim('01:00', '가', { kind: 'player' }), sim('02:00', '가', { kind: 'player' })])
    expect(rows.map((r) => r.duplicate)).toEqual([false, false])
  })
})

describe('같은 이름 선수', () => {
  it('표시만 하고 기본 저장은 유지한다', () => {
    const songs = [makeSong({ kind: 'player', title: '홍 길동', videoId: 'old', start: 5 })]
    const rows = simple([sim('01:00', '홍길동', { kind: 'player' }), sim('02:00', '홍길동', { kind: 'situation' })], 1000, songs)
    expect(rows[0].sameNamePlayer).toBe(true)
    expect(rows[0].willSave).toBe(true)
    expect(rows[1].sameNamePlayer).toBe(false)
  })

  it('이미 있음이면 같은 이름 표시를 하지 않는다', () => {
    const songs = [makeSong({ kind: 'player', title: '홍길동', videoId: 'vvvvvvvvvvv', start: 60 })]
    const rows = simple([sim('01:00', '홍길동', { kind: 'player' })], 1000, songs)
    expect(rows[0].sameNamePlayer).toBe(false)
  })
})

describe('이름 검사', () => {
  it('빈 이름과 30자 초과를 막는다', () => {
    const rows = simple([sim('01:00', '   '), sim('02:00', 'a'.repeat(31)), sim('03:00', 'a'.repeat(30))])
    expect(rows[0].titleError).toBe('이름을 입력해 주세요')
    expect(rows[1].titleError).toBe('이름은 30자 이하로 입력해 주세요')
    expect(rows[2].titleError).toBeNull()
    expect(rows.map((r) => r.selectable)).toEqual([false, false, true])
    expect(rows.map((r) => r.willSave)).toEqual([false, false, true])
  })

  it('selection이 on이어도 선택 불가면 저장하지 않는다', () => {
    const rows = simple([sim('01:00', '', { selection: 'on' })])
    expect(rows[0].willSave).toBe(false)
  })

  it('selection off는 저장하지 않는다', () => {
    const rows = simple([sim('01:00', 'a', { selection: 'off' })])
    expect(rows[0].selectable).toBe(true)
    expect(rows[0].willSave).toBe(false)
  })
})
