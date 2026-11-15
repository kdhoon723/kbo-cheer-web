//20241476-김도훈-(2026-11-15)
import { isTeamId } from '../data/teams.ts'
import type { Settings, Song, TeamState } from '../types.ts'
import { isRecord, isSongArray } from './songValidation.ts'

export const SONGS_KEY = 'kboCheer.songs'
export const TEAM_KEY = 'kboCheer.team'
export const SETTINGS_KEY = 'kboCheer.settings'
export const BROKEN_KEY = 'kboCheer.songs.broken'

export type LoadStatus = 'ok' | 'missing' | 'corrupt' | 'unavailable'
export interface LoadResult<T> {
  value: T
  status: LoadStatus
}

export const DEFAULT_SETTINGS: Settings = { volume: 100, gridSort: 'chapter' }
const DEFAULT_TEAM_STATE: TeamState = { currentTeamId: null, prevTeamId: null }

type RawRead = { kind: 'ok'; raw: string } | { kind: 'missing' } | { kind: 'unavailable' }

function readRaw(key: string): RawRead {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? { kind: 'missing' } : { kind: 'ok', raw }
  } catch {
    return { kind: 'unavailable' }
  }
}

function parseJson(raw: string): unknown {
  try {
    const data: unknown = JSON.parse(raw)
    return data
  } catch {
    return undefined
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function backupBroken(raw: string): void {
  try {
    if (localStorage.getItem(BROKEN_KEY) === null) localStorage.setItem(BROKEN_KEY, raw)
  } catch {
    // 백업은 부가 기능이라 실패해도 복구를 막지 않는다
  }
}

function isTeamState(x: unknown): x is TeamState {
  if (!isRecord(x)) return false
  const { currentTeamId, prevTeamId } = x
  if (currentTeamId === null) return prevTeamId === null
  return isTeamId(currentTeamId) && (prevTeamId === null || isTeamId(prevTeamId))
}

function isSettings(x: unknown): x is Settings {
  if (!isRecord(x)) return false
  const { volume, gridSort } = x
  return (
    typeof volume === 'number' &&
    Number.isInteger(volume) &&
    volume >= 0 &&
    volume <= 100 &&
    (gridSort === 'chapter' || gridSort === 'name')
  )
}

export function loadSongs(seed: Song[]): LoadResult<Song[]> {
  const read = readRaw(SONGS_KEY)
  if (read.kind === 'unavailable') return { value: seed, status: 'unavailable' }
  if (read.kind === 'missing') return { value: seed, status: 'missing' }
  const data = parseJson(read.raw)
  if (isRecord(data) && data.version === 1 && isSongArray(data.songs)) {
    return { value: data.songs, status: 'ok' }
  }
  backupBroken(read.raw)
  return { value: seed, status: 'corrupt' }
}

export function saveSongs(songs: Song[]): boolean {
  return write(SONGS_KEY, { version: 1, songs })
}

export function loadTeamState(): LoadResult<TeamState> {
  const read = readRaw(TEAM_KEY)
  if (read.kind === 'unavailable') return { value: DEFAULT_TEAM_STATE, status: 'unavailable' }
  if (read.kind === 'missing') return { value: DEFAULT_TEAM_STATE, status: 'missing' }
  const data = parseJson(read.raw)
  if (isRecord(data) && data.version === 1 && isTeamState(data)) {
    const state: TeamState =
      data.currentTeamId === null
        ? { currentTeamId: null, prevTeamId: null }
        : { currentTeamId: data.currentTeamId, prevTeamId: data.prevTeamId }
    return { value: state, status: 'ok' }
  }
  return { value: DEFAULT_TEAM_STATE, status: 'corrupt' }
}

export function saveTeamState(state: TeamState): boolean {
  return write(TEAM_KEY, { version: 1, ...state })
}

export function loadSettings(): LoadResult<Settings> {
  const read = readRaw(SETTINGS_KEY)
  if (read.kind === 'unavailable') return { value: DEFAULT_SETTINGS, status: 'unavailable' }
  if (read.kind === 'missing') return { value: DEFAULT_SETTINGS, status: 'missing' }
  const data = parseJson(read.raw)
  if (isRecord(data) && data.version === 1 && isSettings(data)) {
    return { value: { volume: data.volume, gridSort: data.gridSort }, status: 'ok' }
  }
  return { value: DEFAULT_SETTINGS, status: 'corrupt' }
}

export function saveSettings(settings: Settings): boolean {
  return write(SETTINGS_KEY, { version: 1, ...settings })
}
