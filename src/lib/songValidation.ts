//20241476-김도훈-(2026-11-15)
import { isTeamId } from '../data/teams.ts'
import type { Song, SongKind } from '../types.ts'

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
