//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { NowPlaying, Song } from '../types.ts'
import { useSongs } from './SongsContext.tsx'

interface PlayerContextValue {
  nowPlaying: NowPlaying | null
  play: (song: Song) => void
  stop: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { songs } = useSongs()
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)

  useEffect(() => {
    setNowPlaying((prev) => (prev && !songs.some((s) => s.id === prev.songId) ? null : prev))
  }, [songs])

  const play = useCallback((song: Song) => {
    setNowPlaying({ songId: song.id, videoId: song.videoId, start: song.start, end: song.end })
  }, [])
  const stop = useCallback(() => setNowPlaying(null), [])

  const value = useMemo(() => ({ nowPlaying, play, stop }), [nowPlaying, play, stop])
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer는 PlayerProvider 안에서만 쓸 수 있습니다')
  return ctx
}
