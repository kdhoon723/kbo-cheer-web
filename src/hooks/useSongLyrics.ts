//20241476-김도훈-(2026-11-16)
import { useEffect, useState } from 'react'
import { LYRICS } from '../lib/media.ts'
import { findLyric, lyricsUrl, parseLyricsFile } from '../lib/lyrics.ts'
import type { Lyric, LyricTable } from '../lib/lyrics.ts'
import type { Song, TeamId } from '../types.ts'

// 팀 파일은 한 번만 받는다. 넓은 화면 칸과 휴대폰 시트가 같은 결과를 쓴다. 실패하면 지워 다음 재생 때 다시 받는다
const cache = new Map<TeamId, Promise<LyricTable | null>>()

function loadTeamLyrics(teamId: TeamId): Promise<LyricTable | null> {
  const cached = cache.get(teamId)
  if (cached) return cached
  const loading = fetch(lyricsUrl(teamId))
    .then(async (res) => (res.ok ? parseLyricsFile(teamId, await res.json()) : null))
    .catch(() => null)
    .then((table) => {
      if (!table) cache.delete(teamId)
      return table
    })
  cache.set(teamId, loading)
  return loading
}

/**
 * 곡의 가사. 첫 화면을 느리게 하지 않게 load가 true가 될 때(그 팀 곡을 처음 틀 때) 그 팀 파일만 받는다.
 * 가사 파일이 없는 빌드(LYRICS false)에서는 아무것도 요청하지 않고 늘 null이다
 */
export function useSongLyrics(song: Song | undefined, load: boolean): Lyric | null {
  const teamId = song?.teamId
  const [loaded, setLoaded] = useState<{ teamId: TeamId; table: LyricTable } | null>(null)

  useEffect(() => {
    if (!LYRICS || !teamId || !load) return
    let alive = true
    void loadTeamLyrics(teamId).then((table) => {
      if (alive && table) setLoaded({ teamId, table })
    })
    return () => {
      alive = false
    }
  }, [teamId, load])

  if (!song || !loaded || loaded.teamId !== song.teamId) return null
  return findLyric(loaded.table, song)
}
