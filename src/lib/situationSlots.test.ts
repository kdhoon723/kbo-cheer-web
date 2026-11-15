//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed-songs.json'
import { TEAM_IDS } from '../data/teams.ts'
import type { Song, TeamId } from '../types.ts'
import { situationCategory, situationLabel, situationSlots } from './situationSlots.ts'
import { parseSongsFile } from './songsFile.ts'
import { makeSong } from './testSongs.ts'

function seedSituations(teamId: TeamId): Song[] {
  const parsed = parseSongsFile(seedJson, { allowEmpty: false })
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.songs.filter((s) => s.teamId === teamId && s.kind === 'situation')
}

function titles(cells: (Song | null)[]): (string | null)[] {
  return cells.map((c) => c?.title ?? null)
}

function situation(title: string, order: number): Song {
  return makeSong({ id: `s-${order}`, kind: 'situation', title, order })
}

describe('situationCategory', () => {
  it('제목 낱말로 칸을 고른다', () => {
    expect(situationCategory('공통 안타 송')).toBe('hit')
    expect(situationCategory('아웃 송')).toBe('out')
    expect(situationCategory('볼넷송')).toBe('walk')
    expect(situationCategory('풀카운트 송')).toBe('fullCount')
    expect(situationCategory('라인업 송')).toBe('lineup')
    expect(situationCategory('공격 라인업송')).toBe('lineup')
    expect(situationCategory('라인업 소개 음악')).toBe('lineupIntro')
    expect(situationCategory('수비 라인업송')).toBe('lineupIntro')
    expect(situationCategory('경기 개시 음악')).toBe('opening')
    expect(situationCategory('승리의 노래')).toBe('etc')
  })
})

describe('situationSlots', () => {
  it('한화: 아웃·라인업 소개·경기 개시·기타 칸은 빈다', () => {
    expect(titles(situationSlots(seedSituations('hanwha')))).toEqual([
      '공통 안타 송', null, '볼넷 송', '풀카운트 송',
      '라인업송', null, null, null,
    ])
  })

  it('롯데: 수비 라인업은 라인업 소개 칸, 공격 라인업은 라인업 칸', () => {
    expect(titles(situationSlots(seedSituations('lotte')))).toEqual([
      '공통 안타 송', null, '볼넷송', '풀카운트 송',
      '공격 라인업송', '수비 라인업송', '경기 개시 음악', null,
    ])
  })

  it('SSG: 라인업 소개 음악과 라인업송이 각자 칸에 간다', () => {
    expect(titles(situationSlots(seedSituations('ssg')))).toEqual([
      '공통 안타 송', null, '볼넷 송', '풀카운트 송',
      '라인업송', '라인업 소개 음악', '경기 개시 음악', null,
    ])
  })

  it('같은 상황은 팀이 바뀌어도 같은 칸이다', () => {
    for (const teamId of TEAM_IDS) {
      const cells = situationSlots(seedSituations(teamId))
      expect(cells, teamId).toHaveLength(8)
      expect(cells[0]?.title, teamId).toMatch(/안타/)
      expect(cells[2]?.title, teamId).toMatch(/볼넷/)
      expect(cells[3]?.title, teamId).toMatch(/풀카운트/)
    }
  })

  it('제 칸이 찬 곡은 앞쪽 빈 칸으로 가고, 먼저 온 곡이 제 칸을 지킨다', () => {
    const cells = situationSlots([
      situation('풀카운트 송', 0),
      situation('풀카운트 송 2', 1),
      situation('아웃 송', 2),
    ])
    expect(titles(cells)).toEqual([
      '풀카운트 송 2', '아웃 송', null, '풀카운트 송',
      null, null, null, null,
    ])
  })

  it('order 순서로 놓는다', () => {
    const cells = situationSlots([situation('안타 B', 5), situation('안타 A', 1)])
    expect(cells[0]?.title).toBe('안타 A')
    expect(cells[1]?.title).toBe('안타 B')
  })

  it('곡이 없으면 8칸 모두 빈다', () => {
    expect(situationSlots([])).toEqual(Array(8).fill(null))
  })

  it('8곡을 넘으면 줄을 더하고 4칸 단위로 빈 칸을 채운다', () => {
    const songs = Array.from({ length: 10 }, (_, i) => situation(`응원 ${i}`, i))
    const cells = situationSlots(songs)
    expect(cells).toHaveLength(12)
    expect(titles(cells).slice(0, 8)).toEqual([
      '응원 1', '응원 2', '응원 3', '응원 4',
      '응원 5', '응원 6', '응원 7', '응원 0',
    ])
    expect(titles(cells).slice(8)).toEqual(['응원 8', '응원 9', null, null])
  })
})

describe('situationLabel', () => {
  it('상황 이름을 쓰고, 이름과 사실상 같은 제목은 다시 쓰지 않는다', () => {
    expect(situationLabel('공통 안타 송')).toEqual({ name: '안타', detail: null })
    expect(situationLabel('볼넷송')).toEqual({ name: '볼넷', detail: null })
    expect(situationLabel('풀카운트 송')).toEqual({ name: '풀카운트', detail: null })
    expect(situationLabel('라인업 송')).toEqual({ name: '라인업', detail: null })
    expect(situationLabel('라인업 소개 곡')).toEqual({ name: '라인업 소개', detail: null })
    expect(situationLabel('경기 개시 음악')).toEqual({ name: '경기 개시', detail: null })
  })

  it('이름만으로 알 수 없는 제목은 아래 줄에 쓴다', () => {
    expect(situationLabel('수비 라인업송')).toEqual({ name: '라인업 소개', detail: '수비 라인업송' })
    expect(situationLabel('공격 라인업송')).toEqual({ name: '라인업', detail: '공격 라인업송' })
    expect(situationLabel('안타 2')).toEqual({ name: '안타', detail: '안타 2' })
  })

  it('기타 칸은 곡 제목을 이름 자리에 쓴다', () => {
    expect(situationLabel('승리의 노래')).toEqual({ name: '승리의 노래', detail: null })
  })

  it('처음 데이터의 10개 구단 상황 곡은 롯데 라인업 두 곡만 제목 줄이 있다', () => {
    const withDetail = TEAM_IDS.flatMap((id) => seedSituations(id))
      .map((s) => situationLabel(s.title).detail)
      .filter((d) => d !== null)
    expect(withDetail.sort()).toEqual(['공격 라인업송', '수비 라인업송'])
  })
})
