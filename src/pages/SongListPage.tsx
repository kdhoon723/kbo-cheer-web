//20241476-김도훈-(2026-11-16)
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ListFilter, Plus } from 'lucide-react'
import { Link, Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.tsx'
import SearchBox from '../components/SearchBox.tsx'
import SongListItem from '../components/SongListItem.tsx'
import StatusMessage from '../components/StatusMessage.tsx'
import { usePlayer } from '../context/PlayerContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { BOARD_QUERY, useMediaQuery } from '../hooks/useMediaQuery.ts'
import { isRecord } from '../lib/songValidation.ts'
import { SONG_TABS, isMissingCheer, listSearchOf, listSongs, listViewOf } from '../lib/songList.ts'
import type { SongListView } from '../lib/songList.ts'
import type { Song, SongKind } from '../types.ts'

const EMPTY_TAB: Record<SongKind, string> = {
  player: '이 팀에 선수 곡이 없습니다',
  situation: '이 팀에 상황 곡이 없습니다',
  team: '이 팀에 팀 응원가가 없습니다',
}

/** 수정 화면에서 돌아올 때 그 곡 줄로 스크롤하고 포커스를 둔다 */
function focusIdOf(state: unknown): string | null {
  return isRecord(state) && typeof state.focusId === 'string' ? state.focusId : null
}

/**
 * 곡 관리 목록. 탭·검색어·필터는 주소(?tab=&q=&missing=1)에 두어 수정 화면에서 돌아와도 그대로다.
 * 넓은 화면(1200px 이상)은 목록 오른쪽에 수정 칸(자식 라우트)을 두고, 좁은 화면은 수정 중이면 수정 칸만 보인다
 */
export default function SongListPage() {
  const team = useActiveTeam()
  const { songId } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const wide = useMediaQuery(BOARD_QUERY)
  const { songs } = useSongs()
  const { nowPlaying, status, play, stop } = usePlayer()
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const editing = songId !== undefined
  const focusId = focusIdOf(location.state)
  // 고른 탭·검색어·필터는 상태로 들고 주소에는 따라 적는다. 주소 값으로 바로 고치면 빠르게 이어 누를 때 앞의 변경을 잃는다.
  // 주소가 밖에서 바뀌면(수정 칸에서 종류를 바꿔 저장) 그 값으로 다시 맞춘다
  const urlSearch = params.toString()
  const [view, setView] = useState<SongListView>(() => listViewOf(params))
  const [seenSearch, setSeenSearch] = useState(urlSearch)
  if (urlSearch !== seenSearch) {
    setSeenSearch(urlSearch)
    if (urlSearch !== listSearchOf(view)) setView(listViewOf(params))
  }

  useEffect(() => {
    const search = listSearchOf(view)
    if (search !== new URLSearchParams(window.location.search).toString()) {
      setParams(new URLSearchParams(search), { replace: true })
    }
  }, [view, setParams])

  useLayoutEffect(() => {
    if (!focusId || editing) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-song-id="${CSS.escape(focusId)}"]`)
    if (!row) return
    row.scrollIntoView({ block: 'center' })
    row.querySelector<HTMLElement>('.song-item-main')?.focus({ preventScroll: true })
  }, [focusId, editing])

  if (!team) return <p>팀을 먼저 선택해 주세요</p>
  if (editing && !wide) return <Outlet />

  const teamId = team.id
  const { tab, q: query, missing: missingOnly } = view
  const teamSongs = songs.filter((s) => s.teamId === teamId)
  const list = listSongs(teamSongs, { kind: tab, query, missingCheerOnly: missingOnly })
  const missingCount = teamSongs.filter(isMissingCheer).length
  const search = listSearchOf(view)
  const suffix = search ? `?${search}` : ''

  function update(change: Partial<SongListView>) {
    setView((v) => ({ ...v, ...change }))
  }

  function preview(song: Song) {
    const playing = nowPlaying?.songId === song.id && status !== 'idle' && status !== 'paused'
    if (playing) stop()
    // 값을 맞추려고 듣는 것이라 튼 횟수·최근 곡에 넣지 않는다
    else play(song, { record: false })
  }

  const head = (
    <div className="page-head">
      <h2>곡 관리 · {team.fullName}</h2>
      <div className="page-actions">
        <Link className="plain-link" to={`/team/${teamId}/songs/data`}>
          백업·초기화
        </Link>
        {teamSongs.length > 0 && (
          <Link className="link-button" to={`/team/${teamId}/songs/add`}>
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            곡 추가
          </Link>
        )}
      </div>
    </div>
  )

  if (teamSongs.length === 0) {
    return (
      <section className="song-list-page">
        {head}
        <EmptyState teamId={teamId} />
      </section>
    )
  }

  const emptyText = query.trim()
    ? `「${query.trim()}」에 맞는 곡이 없습니다`
    : missingOnly
      ? '응원가 시작이 비어 있는 선수 곡이 없습니다'
      : EMPTY_TAB[tab]

  const listPane = (
    <section className="song-list-page">
      {head}
      <div className="tab-bar">
        <div className="tabs" role="tablist" aria-label="곡 종류">
          {SONG_TABS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="tab"
              id={`songs-tab-${kind}`}
              aria-selected={tab === kind}
              aria-controls="songs-panel"
              onClick={() => update({ tab: kind, missing: false })}
            >
              {label} <span className="count">{teamSongs.filter((s) => s.kind === kind).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="song-tools">
        <SearchBox
          value={query}
          onChange={(q) => update({ q })}
          inputRef={searchRef}
          label="이 팀 곡 검색"
          shortcut={false}
        />
        {tab === 'player' && (
          <button
            type="button"
            className="filter-btn"
            aria-pressed={missingOnly}
            onClick={() => update({ missing: !missingOnly })}
          >
            <ListFilter size={18} strokeWidth={1.75} aria-hidden="true" />
            응원가 시작 없는 곡 <span className="count">{missingCount}</span>
          </button>
        )}
      </div>
      <div id="songs-panel" role="tabpanel" aria-labelledby={`songs-tab-${tab}`}>
        {list.length === 0 ? (
          <StatusMessage tone="empty">{emptyText}</StatusMessage>
        ) : (
          <ul className="song-items" ref={listRef}>
            {list.map((s, i) => (
              <SongListItem
                key={s.id}
                song={s}
                index={i}
                editTo={`/team/${teamId}/songs/${encodeURIComponent(s.id)}/edit${suffix}`}
                selected={s.id === songId}
                playing={nowPlaying?.songId === s.id && status !== 'idle' && status !== 'paused'}
                onPreview={preview}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )

  if (!wide) return listPane
  return (
    <div className="songs-split">
      {listPane}
      <div className="songs-detail">
        {editing ? <Outlet /> : <p className="songs-detail-empty">왼쪽 목록에서 곡을 고르면 여기서 고칩니다</p>}
      </div>
    </div>
  )
}
