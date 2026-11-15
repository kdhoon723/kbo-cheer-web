//20241476-김도훈-(2026-11-15)
import { isTeamId } from '../data/teams.ts'
import type { Song, SongFields, SongFormValues, SongKind } from '../types.ts'
import { formatTime, parseTime } from './time.ts'

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

function isKind(x: unknown): x is SongKind {
  return x === 'player' || x === 'team' || x === 'situation'
}

function isInt(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x)
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

export function isSong(x: unknown): x is Song {
  if (!isRecord(x)) return false
  const { id, teamId, kind, title, videoId, videoDuration, start, end, cheerStart, order } = x
  if (typeof id !== 'string' || id === '') return false
  if (!isTeamId(teamId) || !isKind(kind)) return false
  if (typeof title !== 'string' || title !== title.trim()) return false
  if (title.length < 1 || title.length > 30) return false
  if (typeof videoId !== 'string' || !VIDEO_ID.test(videoId)) return false
  if (!isInt(videoDuration) || videoDuration < 1) return false
  if (!isInt(start) || !isInt(end)) return false
  if (start < 0 || start >= end || end > videoDuration) return false
  if (cheerStart !== null) {
    if (kind !== 'player' || !isInt(cheerStart)) return false
    if (cheerStart <= start || cheerStart >= end) return false
  }
  return typeof order === 'number' && Number.isFinite(order)
}

export function isSongArray(x: unknown): x is Song[] {
  if (!Array.isArray(x)) return false
  const items: unknown[] = x
  const songs = items.filter(isSong)
  if (songs.length !== items.length) return false
  return new Set(songs.map((s) => s.id)).size === songs.length
}

export type SongFormResult =
  | { ok: true; fields: SongFields }
  | { ok: false; errors: Partial<Record<keyof SongFormValues, string>> }

export function validateSongForm(values: SongFormValues, videoDuration: number): SongFormResult {
  const errors: Partial<Record<keyof SongFormValues, string>> = {}
  const title = values.title.trim()
  if (title === '') errors.title = '이름을 입력해 주세요'
  else if (title.length > 30) errors.title = '이름은 30자 이하로 입력해 주세요'

  const start = parseTime(values.startText)
  const end = parseTime(values.endText)
  if (start === null) errors.startText = '시각을 00:00 형식으로 입력해 주세요'
  if (end === null) errors.endText = '시각을 00:00 형식으로 입력해 주세요'
  if (start !== null && end !== null) {
    if (start >= end) errors.endText = '끝 시각은 시작 시각보다 뒤여야 합니다'
    else if (end > videoDuration) {
      errors.endText = `끝 시각은 영상 길이(${formatTime(videoDuration)}) 이하여야 합니다`
    }
  }

  let cheerStart: number | null = null
  const cheerText = values.cheerStartText.trim()
  if (values.kind === 'player' && cheerText !== '') {
    cheerStart = parseTime(cheerText)
    if (cheerStart === null) {
      errors.cheerStartText = '시각을 00:00 형식으로 입력해 주세요'
    } else if (start !== null && end !== null && (cheerStart <= start || cheerStart >= end)) {
      errors.cheerStartText = '응원가 시작은 시작과 끝 사이여야 합니다'
    }
  }

  if (Object.keys(errors).length > 0 || start === null || end === null) return { ok: false, errors }
  return { ok: true, fields: { title, kind: values.kind, start, end, cheerStart } }
}
