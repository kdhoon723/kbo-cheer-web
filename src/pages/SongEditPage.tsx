//20241476-김도훈-(2026-11-16)
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ChevronDown, CircleAlert, ExternalLink, Trash2, TriangleAlert } from 'lucide-react'
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import PlayerPortrait from '../components/PlayerPortrait.tsx'
import SegmentBar from '../components/SegmentBar.tsx'
import StatusMessage from '../components/StatusMessage.tsx'
import TeamLogo from '../components/TeamLogo.tsx'
import TimeField from '../components/TimeField.tsx'
import { useNotice } from '../context/NoticeContext.tsx'
import { usePlayer } from '../context/PlayerContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { playerOf } from '../data/players.ts'
import { getTeam } from '../data/teams.ts'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { BOARD_QUERY, useMediaQuery } from '../hooks/useMediaQuery.ts'
import { normalize } from '../lib/hangul.ts'
import { isFormDirty, positionText, previewStart, stepTimeText, youtubeAt } from '../lib/songEdit.ts'
import type { PreviewFrom } from '../lib/songEdit.ts'
import { SONG_TABS, songListPath } from '../lib/songList.ts'
import { validateSongForm } from '../lib/songValidation.ts'
import { formatTime, parseTime } from '../lib/time.ts'
import type { Song, SongFields, SongFormValues } from '../types.ts'

const LEAVE_CONFIRM = '저장하지 않은 변경이 있습니다. 저장하지 않고 나갈까요?'

type TimeKey = 'startText' | 'cheerStartText' | 'endText'

function FieldError({ children }: { children: ReactNode }) {
  return (
    <span className="form-error">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </span>
  )
}

export default function SongEditPage() {
  const { songId } = useParams()
  const team = useActiveTeam()
  const { songs } = useSongs()
  const location = useLocation()

  if (!team) return <p>팀을 먼저 선택해 주세요</p>
  const song = songs.find((s) => s.id === songId && s.teamId === team.id)
  if (!song) {
    return (
      <StatusMessage
        tone="empty"
        action={
          <Link className="link-button" to={`/team/${team.id}/songs`}>
            곡 관리로 돌아가기
          </Link>
        }
      >
        곡을 찾을 수 없습니다
      </StatusMessage>
    )
  }
  return <SongEditor key={song.id} song={song} listSearch={location.search} />
}

function valuesOf(song: Song): SongFormValues {
  return {
    title: song.title,
    kind: song.kind,
    startText: formatTime(song.start),
    endText: formatTime(song.end),
    cheerStartText: song.cheerStart === null ? '' : formatTime(song.cheerStart),
  }
}

interface EditorProps {
  song: Song
  /** 목록에서 온 검색어·필터(?q=&missing=). 돌아갈 때 그대로 둔다 */
  listSearch: string
}

/**
 * 곡 한 개 고치기. 맨 위 요약과 구간 막대, 미리 듣기, 이름·종류·시각 칸, 아래 고정 저장·취소, 맨 아래 삭제.
 * 저장하지 않은 변경이 있으면 다른 화면으로 나갈 때 확인한다(useBlocker, 새로고침·창 닫기는 beforeunload)
 */
function SongEditor({ song, listSearch }: EditorProps) {
  const navigate = useNavigate()
  const wide = useMediaQuery(BOARD_QUERY)
  const { songs, updateSong, deleteSong } = useSongs()
  const { nowPlaying, status, play, getCurrentTime } = usePlayer()
  const { notify } = useNotice()
  const [initial] = useState(() => valuesOf(song))
  const [values, setValues] = useState<SongFormValues>(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof SongFormValues, boolean>>>({})
  const [showAll, setShowAll] = useState(false)
  // 저장·삭제처럼 일부러 나가는 이동은 막지 않는다
  const leaving = useRef(false)
  const listPath = songListPath(song.teamId, listSearch, song.kind)

  const result = validateSongForm(values, song.videoDuration)
  const errors = result.ok ? {} : result.errors
  const dirty = isFormDirty(initial, values)
  const previewing = nowPlaying?.songId === song.id && status !== 'idle'
  const position = useCallback(() => getCurrentTime(), [getCurrentTime])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(LEAVE_CONFIRM)) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  // 좁은 화면은 목록 자리에 수정 화면이 들어서므로, 목록에서 내려온 스크롤 대신 맨 위에서 시작한다
  useLayoutEffect(() => {
    if (!wide) window.scrollTo(0, 0)
  }, [wide])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function set<K extends keyof SongFormValues>(key: K, value: SongFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function touch(key: keyof SongFormValues) {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
  }

  function setTime(key: TimeKey, text: string) {
    set(key, text)
    touch(key)
  }

  function merge(fields: SongFields): Song {
    return { ...song, ...fields, cheerStart: fields.kind === 'player' ? fields.cheerStart : null }
  }

  function preview(from: PreviewFrom) {
    if (!result.ok) {
      setShowAll(true)
      return
    }
    const merged = merge(result.fields)
    const at = previewStart(from, merged.start, merged.end, merged.cheerStart)
    if (at === null) return
    play({ ...merged, start: at })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!result.ok) {
      setShowAll(true)
      return
    }
    updateSong(merge(result.fields))
    notify('저장했습니다')
    leaving.current = true
    // 종류를 바꿨으면 그 곡이 옮겨 간 탭으로 돌아간다
    navigate(songListPath(song.teamId, listSearch, result.fields.kind), { state: { focusId: song.id } })
  }

  function remove() {
    if (!window.confirm(`'${song.title}'을(를) 삭제합니다`)) return
    deleteSong(song.id)
    notify(`${song.title}을(를) 삭제했습니다`)
    leaving.current = true
    navigate(listPath)
  }

  const errorOf = (key: keyof SongFormValues) =>
    (showAll || touched[key]) && errors[key] ? <FieldError>{errors[key]}</FieldError> : null

  // 막대는 지금 칸의 값이 맞으면 그 값, 아니면 저장된 값으로 그린다
  const bar = result.ok ? merge(result.fields) : song
  const player = song.kind === 'player' ? playerOf(song) : null
  const kindLabel = SONG_TABS.find((t) => t.kind === song.kind)?.label ?? ''
  const nowFor = (key: TimeKey) =>
    previewing
      ? () => {
          const t = getCurrentTime()
          if (t !== null) setTime(key, positionText(t))
        }
      : null
  const showDuplicate =
    values.kind === 'situation' &&
    songs.some(
      (s) => s.teamId === song.teamId && s.kind === 'situation' && s.id !== song.id && normalize(s.title) === normalize(values.title),
    )
  const startSec = parseTime(values.startText) ?? song.start

  return (
    <section className="song-edit">
      {!wide && (
        <Link className="back-link" to={listPath} state={{ focusId: song.id }}>
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          곡 목록
        </Link>
      )}
      <header className="edit-summary">
        {song.kind === 'player' ? (
          <PlayerPortrait teamId={song.teamId} player={player} size="dock" />
        ) : (
          <TeamLogo teamId={song.teamId} size={36} />
        )}
        <div>
          <h2>{song.title}</h2>
          <p className="edit-sub">
            {getTeam(song.teamId).name} · {kindLabel}
            {player?.position ? ` · ${player.position}` : ''}
          </p>
        </div>
      </header>

      <SegmentBar start={bar.start} end={bar.end} cheerStart={bar.cheerStart} position={previewing ? position : null} />
      <div className="preview-row" role="group" aria-label="미리 듣기">
        <button type="button" onClick={() => preview('start')}>
          처음부터
        </button>
        {values.kind === 'player' && (
          <button type="button" disabled={!result.ok || result.fields.cheerStart === null} onClick={() => preview('cheer')}>
            응원가부터
          </button>
        )}
        <button type="button" onClick={() => preview('last5')}>
          끝 5초 전부터
        </button>
      </div>

      <form className="song-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="song-title">이름</label>
          <input
            id="song-title"
            type="text"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            onBlur={() => touch('title')}
          />
          {errorOf('title')}
          {showDuplicate && (
            <span className="form-warning">
              <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              같은 제목의 상황 곡이 이미 있습니다. 상황 버튼이 두 개 생깁니다
            </span>
          )}
        </div>
        <div className="field">
          <span id="song-kind">종류</span>
          <div className="kind-toggle" role="group" aria-labelledby="song-kind">
            {SONG_TABS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={values.kind === kind}
                onClick={() => setValues((v) => ({ ...v, kind, cheerStartText: kind === 'player' ? v.cheerStartText : '' }))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <TimeField
          label="시작"
          value={values.startText}
          onChange={(t) => set('startText', t)}
          onStep={(d) => setTime('startText', stepTimeText(values.startText, d, song.videoDuration))}
          onNow={nowFor('startText')}
          onBlur={() => touch('startText')}
          error={errorOf('startText')}
        />
        {values.kind === 'player' && (
          <TimeField
            label="응원가 시작"
            value={values.cheerStartText}
            hint="비워도 됩니다"
            onChange={(t) => set('cheerStartText', t)}
            onStep={(d) =>
              setTime('cheerStartText', stepTimeText(values.cheerStartText || formatTime(startSec), d, song.videoDuration))
            }
            onNow={nowFor('cheerStartText')}
            onBlur={() => touch('cheerStartText')}
            error={errorOf('cheerStartText')}
          />
        )}
        <TimeField
          label="끝"
          value={values.endText}
          onChange={(t) => set('endText', t)}
          onStep={(d) => setTime('endText', stepTimeText(values.endText, d, song.videoDuration))}
          onNow={nowFor('endText')}
          onBlur={() => touch('endText')}
          error={errorOf('endText')}
        />
        <details className="video-info">
          <summary>
            영상 정보
            <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
          </summary>
          <dl>
            <dt>영상 ID</dt>
            <dd>
              <code>{song.videoId}</code>
            </dd>
            <dt>영상 길이</dt>
            <dd>{formatTime(song.videoDuration)}</dd>
          </dl>
          <a href={youtubeAt(song.videoId, startSec)} target="_blank" rel="noopener noreferrer">
            YouTube에서 {formatTime(startSec)}부터 열기
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </details>
        <div className="edit-actions">
          <button type="submit" className="primary-btn" disabled={!dirty}>
            저장
          </button>
          <button type="button" onClick={() => navigate(listPath, { state: { focusId: song.id } })}>
            취소
          </button>
        </div>
      </form>

      <div className="danger-zone">
        <h3>곡 삭제</h3>
        <p>곡 목록에서 이 곡을 지웁니다. 되돌리려면 JSON 백업이나 처음 데이터가 필요합니다</p>
        <button type="button" className="danger-btn" onClick={remove}>
          <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
          곡 삭제
        </button>
      </div>
    </section>
  )
}
