//20241476-김도훈-(2026-11-16)
import type { Song } from '../types.ts'

interface SeedRevision {
  revision: number
  /** 이 차례에 응원가 시작을 새로 넣은 곡인가. 이 곡들만 채워, 앞 차례에 채운 뒤 사용자가 지운 값은 되살리지 않는다 */
  addedCheerStart: (song: Pick<Song, 'teamId'>) => boolean
}

/**
 * 처음 데이터를 고친 차례. 저장된 곡 목록에 적힌 차례보다 뒤의 고침만 차례대로 한 번씩 적용한다.
 * 1: 선수곡 120곡에 응원가 시작 지점을 넣었다(그때 삼성은 0곡) [STEP 3-⑲]
 * 2: 삼성 선수곡 26곡에 응원가 시작 지점을 넣었다 [STEP 3-㉒]
 */
const REVISIONS: readonly SeedRevision[] = [
  { revision: 1, addedCheerStart: () => true },
  { revision: 2, addedCheerStart: (song) => song.teamId === 'samsung' },
]

export const SEED_REVISION = REVISIONS[REVISIONS.length - 1].revision

/** 같은 모음 영상의 같은 구간이면 같은 곡으로 본다. 제목은 사용자가 고칠 수 있어 쓰지 않는다 */
export function songKey(song: { teamId: string; videoId: string; start: number }): string {
  return `${song.teamId}|${song.videoId}|${song.start}`
}

/**
 * 응원가 시작이 비어 있는 선수곡에만 처음 데이터의 값을 채운다. 사용자가 정한 값과 구간을 바꿔 맞지 않는 값은 그대로 둔다.
 * only를 주면 처음 데이터 중 그 곡들의 값만 쓴다
 */
export function fillCheerStarts(saved: Song[], seed: Song[], only: (song: Song) => boolean = () => true): Song[] {
  const starts = new Map<string, number>()
  for (const s of seed) {
    if (s.kind === 'player' && s.cheerStart !== null && only(s)) starts.set(songKey(s), s.cheerStart)
  }
  return saved.map((song) => {
    if (song.kind !== 'player' || song.cheerStart !== null) return song
    const sec = starts.get(songKey(song))
    return sec !== undefined && song.start < sec && sec < song.end ? { ...song, cheerStart: sec } : song
  })
}

/** 예전 차례로 저장된 곡 목록을 지금 차례로 올린다. 고칠 것이 없으면 같은 배열을 돌려준다 */
export function upgradeSavedSongs(saved: Song[], seed: Song[], fromRevision: number): Song[] {
  return REVISIONS.filter((r) => r.revision > fromRevision).reduce(
    (songs, r) => fillCheerStarts(songs, seed, r.addedCheerStart),
    saved,
  )
}
