//20241476-김도훈-(2026-11-16)
import { parseSongsFile } from '../lib/songsFile.ts'
import type { Song } from '../types.ts'

let loading: Promise<Song[]> | null = null

/**
 * 처음 데이터(seed-songs.json, 약 87 KB, gzip 15 KB)는 응원 화면 첫 묶음에서 빼고 필요할 때 받는다 [STEP 3-㉔].
 * 필요한 때: 저장된 곡 목록이 없거나 깨졌거나 예전 차례일 때, 「처음 데이터로 되돌리기」, 곡 추가의 「이 팀 기본 모음 영상」.
 * 한 번 받으면 다시 받지 않는다. 받지 못하면 다음에 다시 시도한다
 */
export function loadSeedSongs(): Promise<Song[]> {
  loading ??= import('./seed-songs.json')
    .then((m) => {
      const parsed = parseSongsFile(m.default, { allowEmpty: true })
      if (parsed.ok) return parsed.songs
      console.error('seed-songs.json 형식이 올바르지 않습니다:', parsed.error)
      return []
    })
    .catch((e: unknown) => {
      loading = null
      throw e
    })
  return loading
}
