//20241476-김도훈-(2026-11-15)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BROKEN_KEY,
  DEFAULT_SETTINGS,
  HISTORY_KEY,
  SETTINGS_KEY,
  SONGS_KEY,
  TEAM_KEY,
  LAST_EXPORT_KEY,
  loadHistory,
  loadLastExport,
  loadSettings,
  loadSongs,
  loadTeamState,
  saveHistory,
  saveLastExport,
  saveSettings,
  saveSongs,
  saveTeamState,
} from './storage.ts'
import { SEED_REVISION } from './seedData.ts'
import { TEAM_IDS } from '../data/teams.ts'
import { makeSong } from './testSongs.ts'

const seed = [makeSong({ id: 'seed-1' })]

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('songs', () => {
  it('저장한 곡을 그대로 읽는다', () => {
    const songs = [makeSong({ id: 'a' }), makeSong({ id: 'b', kind: 'player', cheerStart: 30 })]
    expect(saveSongs(songs)).toBe(true)
    expect(loadSongs(seed)).toEqual({ value: songs, status: 'ok' })
  })

  it('처음 데이터 차례를 함께 저장한다', () => {
    saveSongs(seed)
    expect(JSON.parse(localStorage.getItem(SONGS_KEY) ?? '')).toMatchObject({ version: 1, seedRevision: SEED_REVISION })
  })

  describe('응원가 시작을 넣기 전에 저장한 목록', () => {
    const seedWithCheer = [
      makeSong({ id: 's1', kind: 'player', start: 10, end: 60, cheerStart: 30 }),
      makeSong({ id: 's2', kind: 'player', start: 60, end: 120, cheerStart: 80 }),
    ]
    // 예전 목록: 처음 데이터의 두 곡 + 사용자가 s2에 직접 정한 값 + 직접 추가한 곡. 차례가 적혀 있지 않다
    const old = [
      makeSong({ id: 's1', kind: 'player', start: 10, end: 60 }),
      makeSong({ id: 's2', kind: 'player', start: 60, end: 120, cheerStart: 70 }),
      makeSong({ id: 'mine', kind: 'player', start: 200, end: 260 }),
    ]

    it('비어 있는 곡만 한 번 채우고 직접 정한 값은 그대로 둔다', () => {
      localStorage.setItem(SONGS_KEY, JSON.stringify({ version: 1, songs: old }))
      const { value, status } = loadSongs(seedWithCheer)
      expect(status).toBe('ok')
      expect(value.map((s) => s.cheerStart)).toEqual([30, 70, null])
    })

    it('지금 차례로 저장된 목록은 다시 채우지 않는다(사용자가 지운 값을 되살리지 않는다)', () => {
      saveSongs(old)
      expect(loadSongs(seedWithCheer).value.map((s) => s.cheerStart)).toEqual([null, 70, null])
    })
  })

  it('저장된 값이 없으면 처음 데이터와 missing', () => {
    expect(loadSongs(seed)).toEqual({ value: seed, status: 'missing' })
    expect(localStorage.getItem(BROKEN_KEY)).toBeNull()
  })

  it.each([
    ['JSON이 아님', '{not json'],
    ['version이 다름', JSON.stringify({ version: 2, songs: [] })],
    ['곡 하나가 잘못됨', JSON.stringify({ version: 1, songs: [makeSong(), makeSong({ id: 'x', end: 5 })] })],
    ['id가 겹침', JSON.stringify({ version: 1, songs: [makeSong(), makeSong()] })],
  ])('%s이면 처음 데이터와 corrupt, 원본은 백업', (_name, raw) => {
    localStorage.setItem(SONGS_KEY, raw)
    expect(loadSongs(seed)).toEqual({ value: seed, status: 'corrupt' })
    expect(localStorage.getItem(BROKEN_KEY)).toBe(raw)
  })

  it('백업은 한 번만 쓰고 덮어쓰지 않는다', () => {
    localStorage.setItem(SONGS_KEY, 'first')
    loadSongs(seed)
    localStorage.setItem(SONGS_KEY, 'second')
    loadSongs(seed)
    expect(localStorage.getItem(BROKEN_KEY)).toBe('first')
  })

  it('getItem이 막히면 unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadSongs(seed)).toEqual({ value: seed, status: 'unavailable' })
  })

  it('setItem이 실패하면 false', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(saveSongs(seed)).toBe(false)
    expect(saveTeamState({ currentTeamId: 'lg', prevTeamId: null })).toBe(false)
    expect(saveSettings(DEFAULT_SETTINGS)).toBe(false)
  })
})

describe('team state', () => {
  it('왕복한다', () => {
    const state = { currentTeamId: 'lg', prevTeamId: 'kt' } as const
    saveTeamState(state)
    expect(loadTeamState()).toEqual({ value: state, status: 'ok' })
  })

  it('없으면 둘 다 null과 missing', () => {
    expect(loadTeamState()).toEqual({ value: { currentTeamId: null, prevTeamId: null }, status: 'missing' })
  })

  it.each([
    ['현재 팀 없이 전 팀만', { version: 1, currentTeamId: null, prevTeamId: 'lg' }],
    ['없는 팀 ID', { version: 1, currentTeamId: 'zzz', prevTeamId: null }],
    ['version이 다름', { version: 2, currentTeamId: 'lg', prevTeamId: null }],
  ])('%s이면 기본값과 corrupt', (_name, data) => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(data))
    expect(loadTeamState()).toEqual({ value: { currentTeamId: null, prevTeamId: null }, status: 'corrupt' })
  })
})

describe('settings', () => {
  it('왕복한다', () => {
    const settings = { volume: 40, gridSort: 'name', teamSort: 'video', teamOrder: [...TEAM_IDS].reverse() } as const
    saveSettings(settings)
    expect(loadSettings()).toEqual({ value: settings, status: 'ok' })
  })

  it('없으면 기본값과 missing', () => {
    expect(loadSettings()).toEqual({ value: DEFAULT_SETTINGS, status: 'missing' })
  })

  it.each([
    ['소수 볼륨', { version: 1, volume: 50.5, gridSort: 'name' }],
    ['범위 밖 볼륨', { version: 1, volume: 101, gridSort: 'name' }],
    ['version이 다름', { version: 2, volume: 50, gridSort: 'name' }],
  ])('%s이면 기본값과 corrupt', (_name, data) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
    expect(loadSettings()).toEqual({ value: DEFAULT_SETTINGS, status: 'corrupt' })
  })

  it.each([['chapter'], ['x'], [7], [null]])('알 수 없는 정렬 %j은 기본 정렬로 두고 볼륨은 지키며 ok', (gridSort) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, volume: 50, gridSort }))
    expect(loadSettings()).toEqual({ value: { volume: 50, gridSort: 'starters', teamSort: 'popular', teamOrder: [...TEAM_IDS] }, status: 'ok' })
  })

  it('정렬이 빠진 예전 값도 볼륨을 지킨다', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, volume: 20 }))
    expect(loadSettings()).toEqual({ value: { volume: 20, gridSort: 'starters', teamSort: 'popular', teamOrder: [...TEAM_IDS] }, status: 'ok' })
  })

  it('팀 순서가 10개 팀이 아니면 처음 순서로 두고 나머지는 지킨다', () => {
    const teamOrder = TEAM_IDS.slice(1)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, volume: 50, gridSort: 'name', teamSort: 'video', teamOrder }))
    expect(loadSettings().value).toEqual({ volume: 50, gridSort: 'name', teamSort: 'video', teamOrder: [...TEAM_IDS] })
  })

  it('예전에 저장한 가사 펼침 값(lyricsOpen)은 읽지 않는다 [STEP 3-㉛]', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, volume: 30, gridSort: 'name', lyricsOpen: false }))
    expect(loadSettings().value).toEqual({ volume: 30, gridSort: 'name', teamSort: 'popular', teamOrder: [...TEAM_IDS] })
  })

  it.each([['rank'], [3], [null]])('알 수 없는 팀 응원가 정렬 %j은 인기순으로 두고 나머지는 지킨다', (teamSort) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, volume: 50, gridSort: 'name', teamSort }))
    expect(loadSettings()).toEqual({ value: { volume: 50, gridSort: 'name', teamSort: 'popular', teamOrder: [...TEAM_IDS] }, status: 'ok' })
  })
})

describe('history', () => {
  it('왕복한다', () => {
    const history = { counts: { a: 2, b: 1 }, recent: ['b', 'a'] }
    saveHistory(history)
    expect(loadHistory()).toEqual({ value: history, status: 'ok' })
  })

  it('없으면 빈 기록과 missing', () => {
    expect(loadHistory()).toEqual({ value: { counts: {}, recent: [] }, status: 'missing' })
  })

  it('곡 목록 키와 따로 저장한다', () => {
    saveHistory({ counts: { a: 1 }, recent: ['a'] })
    saveSongs(seed)
    expect(localStorage.getItem(HISTORY_KEY)).toContain('"a"')
    localStorage.removeItem(SONGS_KEY)
    expect(loadHistory().status).toBe('ok')
  })

  it.each([
    ['깨진 JSON', '{'],
    ['version이 다름', JSON.stringify({ version: 2, counts: {}, recent: [] })],
    ['counts가 배열', JSON.stringify({ version: 1, counts: [], recent: [] })],
    ['recent가 없음', JSON.stringify({ version: 1, counts: {} })],
  ])('%s이면 빈 기록과 corrupt', (_name, raw) => {
    localStorage.setItem(HISTORY_KEY, raw)
    expect(loadHistory()).toEqual({ value: { counts: {}, recent: [] }, status: 'corrupt' })
  })

  it('저장소를 못 쓰면 unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadHistory().status).toBe('unavailable')
    vi.restoreAllMocks()
  })
})

describe('last export', () => {
  it('왕복한다', () => {
    saveLastExport({ at: '2026-11-16T10:00:00.000Z', count: 507 })
    expect(loadLastExport()).toEqual({ at: '2026-11-16T10:00:00.000Z', count: 507 })
  })

  it.each([
    ['없음', null],
    ['깨진 JSON', '{'],
    ['날짜가 아님', JSON.stringify({ version: 1, at: 'x', count: 1 })],
    ['곡 수가 소수', JSON.stringify({ version: 1, at: '2026-11-16T10:00:00.000Z', count: 1.5 })],
  ])('%s이면 null', (_name, raw) => {
    if (raw !== null) localStorage.setItem(LAST_EXPORT_KEY, raw)
    expect(loadLastExport()).toBeNull()
  })
})

