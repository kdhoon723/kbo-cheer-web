//20241476-김도훈-(2026-11-15)
import { useMemo, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { createPortal } from 'react-dom'
import { useNavigate, useOutletContext } from 'react-router-dom'
import EmptyState from '../components/EmptyState.tsx'
import PlayerGrid from '../components/PlayerGrid.tsx'
import SearchBox from '../components/SearchBox.tsx'
import SearchResults from '../components/SearchResults.tsx'
import StatusMessage from '../components/StatusMessage.tsx'
import SituationGrid from '../components/SituationGrid.tsx'
import TeamSongList from '../components/TeamSongList.tsx'
import { useHistory } from '../context/historyState.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSituationSlot } from '../context/SituationSlotContext.ts'
import { useSongs } from '../context/SongsContext.tsx'
import { playerOf } from '../data/players.ts'
import { getTeam } from '../data/teams.ts'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.ts'
import type { SwitchDirection } from '../lib/motion.ts'
import { recentSongs } from '../lib/history.ts'
import { sortPlayerSongs } from '../lib/playerSort.ts'
import type { SearchHit } from '../lib/search.ts'
import { buildSearchIndex, searchIndex } from '../lib/search.ts'
import { situationSlots } from '../lib/situationSlots.ts'
import type { GridSort, Song } from '../types.ts'
import { distance, swap } from '../ui/motionTokens.ts'

type Tab = 'players' | 'team'

const SORTS: { value: GridSort; label: string }[] = [
  { value: 'starters', label: '주전순' },
  { value: 'name', label: '가나다' },
  { value: 'frequent', label: '자주 튼' },
]

export default function MainPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs } = useSongs()
  const { settings, setGridSort, teamState } = usePrefs()
  const { history } = useHistory()
  const { nowPlaying, play, stop, skipToCheer } = usePlayer()
  const situationSlot = useSituationSlot()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('players')
  const [searchFocused, setSearchFocused] = useState(false)
  // 「자주 튼」 순서는 화면을 열거나 정렬을 고를 때의 횟수로 정한다. 곡을 누를 때마다 칸이 옮겨 가면 다음 칸을 누르기 어렵다
  const [order, setOrder] = useState({ sort: settings.gridSort, counts: history.counts })
  if (order.sort !== settings.gridSort) setOrder({ sort: settings.gridSort, counts: history.counts })
  const inputRef = useRef<HTMLInputElement>(null)
  const enterFrom = useOutletContext<SwitchDirection>()

  const teamId = team?.id ?? null
  const { players, teamSongs, situations } = useMemo(() => {
    const mine = songs.filter((s) => s.teamId === teamId)
    const byOrder = (kind: Song['kind']) => mine.filter((s) => s.kind === kind).sort((a, b) => a.order - b.order)
    const players = sortPlayerSongs(byOrder('player'), order.sort, { playerOf, counts: order.counts })
    return { players, teamSongs: byOrder('team'), situations: byOrder('situation') }
  }, [songs, teamId, order])
  const cells = useMemo(() => situationSlots(situations), [situations])

  const index = useMemo(() => buildSearchIndex(songs), [songs])
  const hits = useMemo(
    () => (teamId ? searchIndex(index, query, teamId) : []),
    [index, query, teamId],
  )

  const recent = useMemo(() => recentSongs(history, songs), [history, songs])
  const recentHits = useMemo<SearchHit[]>(
    () => recent.map((song) => ({ song, team: getTeam(song.teamId), isCurrentTeam: song.teamId === teamId })),
    [recent, teamId],
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
  const showRecent = searchFocused && !searching
  const isEmpty = players.length + teamSongs.length + situations.length === 0

  function pick(song: Song) {
    play(song)
    if (song.teamId !== team?.id) navigate('/team/' + song.teamId)
  }

  function pickRecent(song: Song) {
    pick(song)
    inputRef.current?.blur()
  }

  return (
    <div className="main-page">
      <SearchBox
        value={query}
        onChange={setQuery}
        inputRef={inputRef}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
      />
      {searching ? (
        <SearchResults hits={hits} nowPlayingId={nowPlayingId} onPick={pick} />
      ) : showRecent ? (
        <section className="recent" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="recent-heading">
            최근 튼 곡
          </h2>
          {recentHits.length === 0 ? (
            <StatusMessage tone="empty">아직 튼 곡이 없습니다</StatusMessage>
          ) : (
            <SearchResults hits={recentHits} nowPlayingId={nowPlayingId} onPick={pickRecent} />
          )}
        </section>
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
          <m.div
            id="panel-songs"
            role="tabpanel"
            aria-labelledby={tab === 'players' ? 'tab-players' : 'tab-team'}
            initial={enterFrom === 0 ? false : { x: enterFrom * distance.team, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={swap}
          >
            {tab === 'players' ? (
              <PlayerGrid
                songs={players}
                nowPlayingId={nowPlayingId}
                counts={settings.gridSort === 'frequent' ? history.counts : undefined}
                onPlay={play}
              />
            ) : (
              <TeamSongList songs={teamSongs} nowPlayingId={nowPlayingId} onPlay={play} />
            )}
          </m.div>
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
