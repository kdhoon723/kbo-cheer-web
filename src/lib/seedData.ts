//20241476-김도훈-(2026-11-16)
import type { Song } from '../types.ts'

/**
 * 처음 데이터를 고친 차례. 저장된 곡 목록에 적힌 차례가 이보다 작으면 그 사이의 고침을 한 번 적용한다.
 * 1: 선수곡 120곡에 응원가 시작 지점을 넣었다
 */
export const SEED_REVISION = 1

/** 같은 모음 영상의 같은 구간이면 같은 곡으로 본다. 제목은 사용자가 고칠 수 있어 쓰지 않는다 */
export function songKey(song: { teamId: string; videoId: string; start: number }): string {
  return `${song.teamId}|${song.videoId}|${song.start}`
}

/** 응원가 시작이 비어 있는 선수곡에만 처음 데이터의 값을 채운다. 사용자가 정한 값과 구간을 바꿔 맞지 않는 값은 그대로 둔다 */
export function fillCheerStarts(saved: Song[], seed: Song[]): Song[] {
  const starts = new Map<string, number>()
  for (const s of seed) {
    if (s.kind === 'player' && s.cheerStart !== null) starts.set(songKey(s), s.cheerStart)
  }
  return saved.map((song) => {
    if (song.kind !== 'player' || song.cheerStart !== null) return song
    const sec = starts.get(songKey(song))
    return sec !== undefined && song.start < sec && sec < song.end ? { ...song, cheerStart: sec } : song
  })
}

/** 예전 차례로 저장된 곡 목록을 지금 차례로 올린다 */
export function upgradeSavedSongs(saved: Song[], seed: Song[], fromRevision: number): Song[] {
  return fromRevision < 1 ? fillCheerStarts(saved, seed) : saved
}
