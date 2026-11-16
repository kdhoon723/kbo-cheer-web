//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import type { CandidateRow } from '../types.ts'
import {
  bulkSelection,
  importOrders,
  hasCandidateWarning,
  isExistingCandidate,
  matchesFilter,
  reviewCounts,
  savedTab,
  songsPerTeam,
  teamVideoId,
} from './importReview.ts'
import { makeSong } from './testSongs.ts'

function row(key: number, extra: Partial<CandidateRow> = {}): CandidateRow {
  return {
    key,
    lineNo: key,
    rawLine: '',
    inTeamSection: false,
    teamId: null,
    kind: 'player',
    title: `곡${key}`,
    startText: '00:00',
    selection: 'auto',
    start: 0,
    end: 10,
    warning: null,
    existing: false,
    duplicate: false,
    sameNamePlayer: false,
    otherTeam: false,
    titleError: null,
    selectable: true,
    willSave: true,
    ...extra,
  }
}

const rows = [
  row(1),
  row(2, { existing: true, willSave: false }),
  row(3, { duplicate: true, selectable: false, willSave: false }),
  row(4, { warning: 'timeReversed', selectable: false, willSave: false }),
  row(5, { titleError: '이름을 입력해 주세요', selectable: false, willSave: false }),
]

describe('후보 분류', () => {
  it('이미 있음은 이미 있는 곡과 같은 상황 곡, 경고는 시각 이상과 이름 오류', () => {
    expect(rows.map(isExistingCandidate)).toEqual([false, true, true, false, false])
    expect(rows.map(hasCandidateWarning)).toEqual([false, false, false, true, true])
  })

  it('필터와 개수', () => {
    expect(rows.filter((r) => matchesFilter(r, 'new')).map((r) => r.key)).toEqual([1])
    expect(reviewCounts(rows)).toEqual({ all: 5, new: 1, warning: 2, existing: 2 })
  })
})

describe('bulkSelection', () => {
  it('전체 선택은 고를 수 있는 새 곡만, 이미 있는 곡은 빼고', () => {
    expect(bulkSelection(rows, true)).toEqual([{ key: 1, selection: 'on' }])
  })

  it('전체 해제는 고를 수 있는 곡 모두', () => {
    expect(bulkSelection(rows, false)).toEqual([
      { key: 1, selection: 'off' },
      { key: 2, selection: 'off' },
    ])
  })
})

describe('savedTab', () => {
  it.each([
    [['team', 'player'], 'player'],
    [['team', 'situation'], 'situation'],
    [['team'], 'team'],
    [[], 'player'],
  ] as const)('%j → %s', (kinds, tab) => {
    expect(savedTab([...kinds])).toBe(tab)
  })
})

describe('teamVideoId와 songsPerTeam', () => {
  const songs = [
    makeSong({ id: 'a', videoId: 'aaaaaaaaaaa' }),
    makeSong({ id: 'b', videoId: 'bbbbbbbbbbb' }),
    makeSong({ id: 'c', videoId: 'bbbbbbbbbbb' }),
    makeSong({ id: 'd', teamId: 'lg', videoId: 'ccccccccccc' }),
  ]

  it('그 팀에서 가장 많이 쓴 영상', () => {
    expect(teamVideoId(songs, 'hanwha')).toBe('bbbbbbbbbbb')
    expect(teamVideoId(songs, 'kt')).toBeNull()
  })

  it('곡이 있는 팀만 팀 목록 순서로 센다', () => {
    expect(songsPerTeam(songs)).toEqual([
      { teamId: 'hanwha', count: 3 },
      { teamId: 'lg', count: 1 },
    ])
  })
})

describe('importOrders', () => {
  it('팀마다 그 팀 마지막 곡 다음부터 차례로 붙인다', () => {
    const songs = [
      makeSong({ id: 'a', teamId: 'hanwha', order: 4 }),
      makeSong({ id: 'b', teamId: 'hanwha', order: 9 }),
      makeSong({ id: 'c', teamId: 'lg', order: 2 }),
    ]
    const drafts = [{ teamId: 'hanwha' as const }, { teamId: 'samsung' as const }, { teamId: 'hanwha' as const }, { teamId: 'lg' as const }]
    expect(importOrders(songs, drafts)).toEqual([10, 0, 11, 3])
  })
})
