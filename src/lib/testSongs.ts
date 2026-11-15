//20241476-김도훈-(2026-11-15)
import type { Song } from '../types.ts'

export function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    teamId: 'hanwha',
    kind: 'player',
    title: '선수',
    videoId: 'abcdefghijk',
    videoDuration: 600,
    start: 10,
    end: 70,
    cheerStart: null,
    order: 0,
    ...overrides,
  }
}
