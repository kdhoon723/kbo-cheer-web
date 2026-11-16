//20241476-김도훈-(2026-11-15)
import { startTransition, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useOutletContext } from 'react-router-dom'
import MatchupHeader from '../components/MatchupHeader.tsx'
import SearchBox from '../components/SearchBox.tsx'
import SearchResults from '../components/SearchResults.tsx'
import SituationGrid from '../components/SituationGrid.tsx'
import SortPicker, { SortToggle } from '../components/SortPicker.tsx'
import SituationTeamTabs from '../components/SituationTeamTabs.tsx'
import StatusMessage from '../components/StatusMessage.tsx'
import TeamColumn from '../components/TeamColumn.tsx'
import { useHistory } from '../context/historyState.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSituationSlot } from '../context/SituationSlotContext.ts'
import { useSongs } from '../context/SongsContext.tsx'
import { getTeam } from '../data/teams.ts'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.ts'
import { BOARD_QUERY, useMediaQuery } from '../hooks/useMediaQuery.ts'
import { recentSongs } from '../lib/history.ts'
import { assignTeam, leavesMatchup, matchupOf, situationTeamOf } from '../lib/matchup.ts'
import type { Matchup, Slot } from '../lib/matchup.ts'
import type { ColumnEnter } from '../lib/motion.ts'
import type { SearchHit } from '../lib/search.ts'
import { buildSearchIndex, searchIndex } from '../lib/search.ts'
import { GRID_SORTS } from '../lib/playerSort.ts'
import { situationSlots } from '../lib/situationSlots.ts'
import { TEAM_SONG_SORTS } from '../lib/teamSongSort.ts'
import type { Song, TeamId } from '../types.ts'

const SITUATION_PANEL_ID = 'situation-panel'

export default function MainPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs } = useSongs()
  const { settings, setGridSort, setTeamSort, teamState, assignTeam: assignSlot } = usePrefs()
  const { history } = useHistory()
  const { nowPlaying, play, stop, skipToCheer } = usePlayer()
  const situationSlot = useSituationSlot()
  const board = useMediaQuery(BOARD_QUERY)
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  // 상황 칸은 마지막으로 누른 곡의 팀을 따른다. 화면을 열 때는 재생 중인 곡의 팀에서 시작한다
  const [lastPicked, setLastPicked] = useState<TeamId | null>(
    () => songs.find((s) => s.id === nowPlaying?.songId)?.teamId ?? null,
  )
  // 「자주 튼」 순서는 화면을 열거나 정렬을 고를 때의 횟수로 정한다. 곡을 누를 때마다 칸이 옮겨 가면 다음 칸을 누르기 어렵다
  const [order, setOrder] = useState({ sort: settings.gridSort, counts: history.counts })
  if (order.sort !== settings.gridSort) setOrder({ sort: settings.gridSort, counts: history.counts })
  const inputRef = useRef<HTMLInputElement>(null)
  const enter = useOutletContext<ColumnEnter>()

  const teamId = team?.id ?? null
  // 휴대폰과 노트북은 URL의 팀 하나만 보인다. 넓은 화면만 전 팀을 오른쪽 열에 함께 둔다
  const shown = useMemo<Matchup | null>(() => {
    if (!teamId) return null
    return board ? matchupOf(teamId, teamState) : { current: teamId, prev: null }
  }, [board, teamId, teamState])
  const situationTeam = shown ? situationTeamOf(lastPicked, shown) : null

  const situations = useMemo(
    () => songs.filter((s) => s.teamId === situationTeam && s.kind === 'situation').sort((a, b) => a.order - b.order),
    [songs, situationTeam],
  )
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

  function playSong(song: Song) {
    play(song)
    setLastPicked(song.teamId)
  }

  useKeyboardShortcuts((action) => {
    switch (action.type) {
      case 'stop':
        stop()
        break
      case 'cheer':
        skipToCheer()
        break
      case 'prevTeam':
        // 넓은 화면은 두 팀이 이미 보이므로 열을 바꾸지 않고 상황 칸의 팀만 바꾼다
        if (shown?.prev && situationTeam) {
          setLastPicked(situationTeam === shown.current ? shown.prev : shown.current)
        } else if (!board && teamState.prevTeamId) {
          navigate('/team/' + teamState.prevTeamId)
        }
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
        if (song) playSong(song)
        break
      }
    }
  })

  if (!team || !shown || !situationTeam) return null
  const nowPlayingId = nowPlaying?.songId ?? null
  const searching = query.trim() !== ''
  const showRecent = searchFocused && !searching
  const liveCounts = settings.gridSort === 'frequent' ? history.counts : undefined

  function pick(song: Song) {
    playSong(song)
    if (shown && leavesMatchup(song.teamId, shown)) navigate('/team/' + song.teamId)
  }

  function pickRecent(song: Song) {
    pick(song)
    inputRef.current?.blur()
  }

  function pickSlot(slot: Slot, next: TeamId) {
    const target = assignTeam(teamState, slot, next).currentTeamId
    // 저장한 팀과 URL이 같은 렌더에 바뀌어야 오른쪽 열이 잠깐 다른 팀을 보이지 않는다
    startTransition(() => {
      assignSlot(slot, next)
      if (target && target !== teamId) navigate('/team/' + target)
    })
  }

  const searchBox = (
    <SearchBox
      value={query}
      onChange={setQuery}
      inputRef={inputRef}
      onFocus={() => setSearchFocused(true)}
      onBlur={() => setSearchFocused(false)}
    />
  )

  const gridSort = { label: '선수 정렬', options: GRID_SORTS, value: settings.gridSort, onChange: setGridSort }
  const teamSort = { label: '팀 응원가 정렬', options: TEAM_SONG_SORTS, value: settings.teamSort, onChange: setTeamSort }
  const sortToggle = <SortToggle {...gridSort} />
  // 팀 응원가 정렬은 넓은 화면에서도 열마다 탭 줄에 둔다. 검색 줄의 정렬은 선수 정렬 하나다
  const teamSortControl = (
    <>
      <SortToggle {...teamSort} />
      <SortPicker {...teamSort} />
    </>
  )

  const column = (id: TeamId, idPrefix: string, enterFrom: ColumnEnter['current']) => (
    <TeamColumn
      key={id}
      teamId={id}
      songs={songs}
      idPrefix={idPrefix}
      sort={order.sort}
      teamSort={settings.teamSort}
      sortCounts={order.counts}
      counts={liveCounts}
      nowPlayingId={nowPlayingId}
      enterFrom={enterFrom}
      sortControl={
        board ? undefined : (
          <>
            {sortToggle}
            <SortPicker {...gridSort} />
          </>
        )
      }
      teamSortControl={teamSortControl}
      onPlay={playSong}
    />
  )

  const situationTeams = shown.prev ? [shown.current, shown.prev] : null
  const situationGrid = <SituationGrid cells={cells} nowPlayingId={nowPlayingId} onPlay={playSong} />

  return (
    <div className={board ? 'main-page is-board' : 'main-page'}>
      {board ? (
        <div className="search-row">
          {searchBox}
          {sortToggle}
        </div>
      ) : (
        searchBox
      )}
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
      ) : board ? (
        <div className="board">
          <MatchupHeader matchup={shown} onPick={pickSlot} />
          <div className="board-columns">
            <section className="board-column" aria-label={`${getTeam(shown.current).name} 곡`}>
              {column(shown.current, '', enter.current)}
            </section>
            <section className="board-column" aria-label={shown.prev ? `${getTeam(shown.prev).name} 곡` : '상대 팀'}>
              {shown.prev ? (
                column(shown.prev, 'prev-', enter.prev)
              ) : (
                <StatusMessage tone="empty">상대 팀을 고르면 두 팀의 선수를 나란히 볼 수 있습니다</StatusMessage>
              )}
            </section>
          </div>
        </div>
      ) : (
        column(shown.current, '', enter.current)
      )}
      {situationSlot &&
        (situations.length > 0 || situationTeams) &&
        createPortal(
          <>
            {situationTeams ? (
              <>
                <SituationTeamTabs
                  teams={situationTeams}
                  selected={situationTeam}
                  panelId={SITUATION_PANEL_ID}
                  onSelect={setLastPicked}
                />
                <div
                  id={SITUATION_PANEL_ID}
                  role="tabpanel"
                  aria-labelledby={`situation-tab-${situationTeam}`}
                >
                  {situations.length > 0 ? (
                    situationGrid
                  ) : (
                    <p className="situation-none">이 팀에는 상황 곡이 없습니다</p>
                  )}
                </div>
              </>
            ) : (
              situationGrid
            )}
            <p className="shortcut-hint">
              <kbd>Space</kbd> 정지 · <kbd>S</kbd> 응원가로 · <kbd>T</kbd> {board ? '상황 팀' : '전 팀'} ·{' '}
              <kbd>/</kbd> 검색 · <kbd>1</kbd>~<kbd>8</kbd> 상황 칸
            </p>
          </>,
          situationSlot,
        )}
    </div>
  )
}
