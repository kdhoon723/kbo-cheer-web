//20241476-김도훈-(2026-11-15)
import { isTeamId } from '../data/teams.ts'
import type { GridSort, PlayHistory, Settings, Song, TeamSongSort, TeamState } from '../types.ts'
import { EMPTY_HISTORY, parseHistory } from './history.ts'
import { SEED_REVISION, upgradeSavedSongs } from './seedData.ts'
import { defaultTeamOrder, parseTeamOrder } from './teamOrder.ts'
import { isRecord, isSongArray } from './songValidation.ts'

export const SONGS_KEY = 'kboCheer.songs'
export const TEAM_KEY = 'kboCheer.team'
export const SETTINGS_KEY = 'kboCheer.settings'
export const HISTORY_KEY = 'kboCheer.history'
export const BROKEN_KEY = 'kboCheer.songs.broken'
export const LAST_EXPORT_KEY = 'kboCheer.lastExport'

export type LoadStatus = 'ok' | 'missing' | 'corrupt' | 'unavailable'
export interface LoadResult<T> {
  value: T
  status: LoadStatus
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 100,
  gridSort: 'starters',
  teamSort: 'popular',
  teamOrder: defaultTeamOrder(),
}
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

/** 예전 값('chapter')이나 알 수 없는 값은 기본 정렬로 바꾼다. 볼륨까지 버리지 않는다 */
function parseGridSort(x: unknown): GridSort {
  return x === 'starters' || x === 'name' || x === 'frequent' ? x : DEFAULT_SETTINGS.gridSort
}

function parseTeamSort(x: unknown): TeamSongSort {
  return x === 'popular' || x === 'name' || x === 'video' ? x : DEFAULT_SETTINGS.teamSort
}

function isVolume(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 100
}

export function loadSongs(seed: Song[]): LoadResult<Song[]> {
  const read = readRaw(SONGS_KEY)
  if (read.kind === 'unavailable') return { value: seed, status: 'unavailable' }
  if (read.kind === 'missing') return { value: seed, status: 'missing' }
  const data = parseJson(read.raw)
  if (isRecord(data) && data.version === 1 && isSongArray(data.songs)) {
    // 차례가 없으면 처음 데이터를 고치기 전에 저장한 목록이다
    const revision = typeof data.seedRevision === 'number' ? data.seedRevision : 0
    return { value: upgradeSavedSongs(data.songs, seed, revision), status: 'ok' }
  }
  backupBroken(read.raw)
  return { value: seed, status: 'corrupt' }
}

/**
 * 처음 데이터 없이 바로 쓸 수 있는 저장 목록. 지금 차례로 저장된 목록이면 그 곡들, 아니면 null이다.
 * null이면 처음 데이터를 받아 loadSongs로 읽는다(없음·깨짐·예전 차례·저장소 못 씀) [STEP 3-㉔]
 */
export function loadCurrentSongs(): Song[] | null {
  const read = readRaw(SONGS_KEY)
  if (read.kind !== 'ok') return null
  const data = parseJson(read.raw)
  if (!isRecord(data) || data.version !== 1 || data.seedRevision !== SEED_REVISION || !isSongArray(data.songs)) return null
  return data.songs
}

export function saveSongs(songs: Song[]): boolean {
  return write(SONGS_KEY, { version: 1, seedRevision: SEED_REVISION, songs })
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
  if (isRecord(data) && data.version === 1 && isVolume(data.volume)) {
    const settings = {
      volume: data.volume,
      gridSort: parseGridSort(data.gridSort),
      teamSort: parseTeamSort(data.teamSort),
      teamOrder: parseTeamOrder(data.teamOrder),
    }
    return { value: settings, status: 'ok' }
  }
  return { value: DEFAULT_SETTINGS, status: 'corrupt' }
}

export function saveSettings(settings: Settings): boolean {
  return write(SETTINGS_KEY, { version: 1, ...settings })
}

export function loadHistory(): LoadResult<PlayHistory> {
  const read = readRaw(HISTORY_KEY)
  if (read.kind === 'unavailable') return { value: EMPTY_HISTORY, status: 'unavailable' }
  if (read.kind === 'missing') return { value: EMPTY_HISTORY, status: 'missing' }
  const data = parseJson(read.raw)
  const history = isRecord(data) && data.version === 1 ? parseHistory(data) : null
  return history ? { value: history, status: 'ok' } : { value: EMPTY_HISTORY, status: 'corrupt' }
}

export function saveHistory(history: PlayHistory): boolean {
  return write(HISTORY_KEY, { version: 1, ...history })
}

/** 마지막으로 JSON을 내보낸 때와 곡 수 [STEP 3-㉔]. 없거나 틀리면 null(안내만 하는 값이라 알리지 않는다) */
export interface LastExport {
  at: string
  count: number
}

export function loadLastExport(): LastExport | null {
  const read = readRaw(LAST_EXPORT_KEY)
  if (read.kind !== 'ok') return null
  const data = parseJson(read.raw)
  if (!isRecord(data) || data.version !== 1) return null
  const { at, count } = data
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at)) || typeof count !== 'number' || !Number.isInteger(count)) {
    return null
  }
  return { at, count }
}

export function saveLastExport(value: LastExport): boolean {
  return write(LAST_EXPORT_KEY, { version: 1, ...value })
}
