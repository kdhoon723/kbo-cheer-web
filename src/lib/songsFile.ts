//20241476-김도훈-(2026-11-15)
import type { Song, SongsFile } from '../types.ts'
import { isRecord, isSongArray } from './songValidation.ts'

export type ParseFileResult =
  | { ok: true; songs: Song[] }
  | { ok: false; error: 'notJson' | 'badFormat' | 'empty' }

export interface ParseFileOptions {
  allowEmpty: boolean
}

export function createSongsFile(songs: Song[], now: Date): SongsFile {
  return { format: 'kbo-cheer-songs', version: 1, exportedAt: now.toISOString(), songs }
}

export function parseSongsFile(input: unknown, { allowEmpty }: ParseFileOptions): ParseFileResult {
  if (!isRecord(input) || input.format !== 'kbo-cheer-songs' || input.version !== 1) {
    return { ok: false, error: 'badFormat' }
  }
  if (!isSongArray(input.songs)) return { ok: false, error: 'badFormat' }
  if (input.songs.length === 0 && !allowEmpty) return { ok: false, error: 'empty' }
  return { ok: true, songs: input.songs }
}

export function parseSongsFileText(text: string, options: ParseFileOptions): ParseFileResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'notJson' }
  }
  return parseSongsFile(data, options)
}
