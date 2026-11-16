//20241476-김도훈-(2026-11-15)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BROKEN_KEY,
  DEFAULT_SETTINGS,
  HISTORY_KEY,
  SETTINGS_KEY,
  SONGS_KEY,
  TEAM_KEY,
  loadHistory,
  loadSettings,
  loadSongs,
  loadTeamState,
  saveHistory,
  saveSettings,
  saveSongs,
  saveTeamState,
} from './storage.ts'
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
    const settings = { volume: 40, gridSort: 'name' } as const
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
    expect(loadSettings()).toEqual({ value: { volume: 50, gridSort: 'starters' }, status: 'ok' })
  })

  it('정렬이 빠진 예전 값도 볼륨을 지킨다', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, volume: 20 }))
    expect(loadSettings()).toEqual({ value: { volume: 20, gridSort: 'starters' }, status: 'ok' })
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
