//20241476-김도훈-(2026-11-16)
import { useEffect, useState } from 'react'
import { loadSeedSongs } from '../data/seedSongs.ts'
import type { Song } from '../types.ts'

/** 처음 데이터. 받는 동안과 받지 못했으면 null [STEP 3-㉔] */
export function useSeedSongs(): Song[] | null {
  const [seed, setSeed] = useState<Song[] | null>(null)
  useEffect(() => {
    let alive = true
    loadSeedSongs().then(
      (songs) => {
        if (alive) setSeed(songs)
      },
      () => {},
    )
    return () => {
      alive = false
    }
  }, [])
  return seed
}
