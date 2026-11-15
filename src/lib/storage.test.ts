//20241476-김도훈-(2026-11-15)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BROKEN_KEY,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SONGS_KEY,
  TEAM_KEY,
  loadSettings,
  loadSongs,
  loadTeamState,
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
    ['소수 볼륨', { version: 1, volume: 50.5, gridSort: 'chapter' }],
    ['범위 밖 볼륨', { version: 1, volume: 101, gridSort: 'chapter' }],
    ['잘못된 정렬', { version: 1, volume: 50, gridSort: 'x' }],
  ])('%s이면 기본값과 corrupt', (_name, data) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
    expect(loadSettings()).toEqual({ value: DEFAULT_SETTINGS, status: 'corrupt' })
  })
})
