//20241476-김도훈-(2026-11-15)
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState.tsx'
import PlayerGrid from '../components/PlayerGrid.tsx'
import SearchBox from '../components/SearchBox.tsx'
import SearchResults from '../components/SearchResults.tsx'
import SituationGrid from '../components/SituationGrid.tsx'
import TeamSongList from '../components/TeamSongList.tsx'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSituationSlot } from '../context/SituationSlotContext.ts'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.ts'
import { buildSearchIndex, searchIndex } from '../lib/search.ts'
import { situationSlots } from '../lib/situationSlots.ts'
import type { GridSort, Song } from '../types.ts'

type Tab = 'players' | 'team'

const SORTS: { value: GridSort; label: string }[] = [
  { value: 'chapter', label: '챕터 순' },
  { value: 'name', label: '가나다 순' },
]

export default function MainPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs } = useSongs()
  const { settings, setGridSort, teamState } = usePrefs()
  const { nowPlaying, play, stop, skipToCheer } = usePlayer()
  const situationSlot = useSituationSlot()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('players')
  const inputRef = useRef<HTMLInputElement>(null)

  const teamId = team?.id ?? null
  const { players, teamSongs, situations } = useMemo(() => {
    const mine = songs.filter((s) => s.teamId === teamId)
    const byOrder = (kind: Song['kind']) => mine.filter((s) => s.kind === kind).sort((a, b) => a.order - b.order)
    const players = byOrder('player')
    if (settings.gridSort === 'name') players.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    return { players, teamSongs: byOrder('team'), situations: byOrder('situation') }
  }, [songs, teamId, settings.gridSort])
  const cells = useMemo(() => situationSlots(situations), [situations])

  const index = useMemo(() => buildSearchIndex(songs), [songs])
  const hits = useMemo(
    () => (teamId ? searchIndex(index, query, teamId) : []),
    [index, query, teamId],
  )

  useKeyboardShortcuts((action) => {
    switch (action.type) {
      case 'stop':
        stop()
        break
      case 'cheer':
        skipToCheer()
        break
      case 'prevTeam':
        if (teamState.prevTeamId) navigate('/team/' + teamState.prevTeamId)
        break
      case 'focusSearch':
        inputRef.current?.focus()
        break
      case 'clearSearch':
        setQuery('')
        inputRef.current?.blur()
        break
      case 'situation': {
        const song = cells[action.index]
        if (song) play(song)
        break
      }
    }
  })

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
          <div className="tab-bar">
            <div className="tabs" role="tablist" aria-label="곡 종류">
              <button
                type="button"
                role="tab"
                id="tab-players"
                aria-selected={tab === 'players'}
                aria-controls="panel-songs"
                onClick={() => setTab('players')}
              >
                선수 <span className="count">{players.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                id="tab-team"
                aria-selected={tab === 'team'}
                aria-controls="panel-songs"
                onClick={() => setTab('team')}
              >
                팀 응원가 <span className="count">{teamSongs.length}</span>
              </button>
            </div>
            {tab === 'players' && (
              <div className="sort-toggle" role="group" aria-label="선수 정렬">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={settings.gridSort === s.value}
                    onClick={() => setGridSort(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div id="panel-songs" role="tabpanel" aria-labelledby={tab === 'players' ? 'tab-players' : 'tab-team'}>
            {tab === 'players' ? (
              <PlayerGrid songs={players} nowPlayingId={nowPlayingId} onPlay={play} />
            ) : (
              <TeamSongList songs={teamSongs} nowPlayingId={nowPlayingId} onPlay={play} />
            )}
          </div>
        </>
      )}
      {situationSlot &&
        situations.length > 0 &&
        createPortal(
          <>
            <SituationGrid cells={cells} nowPlayingId={nowPlayingId} onPlay={play} />
            <p className="shortcut-hint">
              <kbd>Space</kbd> 정지 · <kbd>S</kbd> 응원가로 · <kbd>T</kbd> 전 팀 · <kbd>/</kbd> 검색 ·{' '}
              <kbd>1</kbd>~<kbd>8</kbd> 상황 칸
            </p>
          </>,
          situationSlot,
        )}
    </div>
  )
}
