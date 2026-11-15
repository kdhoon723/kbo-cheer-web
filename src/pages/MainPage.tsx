//20241476-김도훈-(2026-11-15)
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState.tsx'
import PlayerGrid from '../components/PlayerGrid.tsx'
import SearchBox from '../components/SearchBox.tsx'
import SearchResults from '../components/SearchResults.tsx'
import SituationBar from '../components/SituationBar.tsx'
import TeamSongList from '../components/TeamSongList.tsx'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { buildSearchIndex, searchIndex } from '../lib/search.ts'
import type { Song } from '../types.ts'

export default function MainPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs } = useSongs()
  const { settings, setGridSort } = usePrefs()
  const { nowPlaying, play } = usePlayer()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const teamId = team?.id ?? null
  const { players, teamSongs, situations } = useMemo(() => {
    const mine = songs.filter((s) => s.teamId === teamId)
    const byOrder = (kind: Song['kind']) => mine.filter((s) => s.kind === kind).sort((a, b) => a.order - b.order)
    const players = byOrder('player')
    if (settings.gridSort === 'name') players.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    return { players, teamSongs: byOrder('team'), situations: byOrder('situation') }
  }, [songs, teamId, settings.gridSort])

  const index = useMemo(() => buildSearchIndex(songs), [songs])
  const hits = useMemo(
    () => (teamId ? searchIndex(index, query, teamId) : []),
    [index, query, teamId],
  )

  if (!team) return null
  const nowPlayingId = nowPlaying?.songId ?? null
  const searching = query.trim() !== ''
  const isEmpty = players.length + teamSongs.length + situations.length === 0

  function pick(song: Song) {
    play(song)
    if (song.teamId !== team?.id) navigate('/team/' + song.teamId)
  }

  return (
    <div className="main-page">
      <SearchBox value={query} onChange={setQuery} inputRef={inputRef} />
      {searching ? (
        <SearchResults hits={hits} nowPlayingId={nowPlayingId} onPick={pick} />
      ) : isEmpty ? (
        <EmptyState teamId={team.id} />
      ) : (
        <>
          <PlayerGrid
            songs={players}
            sort={settings.gridSort}
            onSortChange={setGridSort}
            nowPlayingId={nowPlayingId}
            onPlay={play}
          />
          <TeamSongList songs={teamSongs} nowPlayingId={nowPlayingId} onPlay={play} />
        </>
      )}
      <SituationBar songs={situations} nowPlayingId={nowPlayingId} onPlay={play} />
    </div>
  )
}
