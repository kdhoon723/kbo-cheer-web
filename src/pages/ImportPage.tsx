//20241476-김도훈-(2026-11-15)
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dataApiAvailability, errorMessage, fetchVideo } from '../api/youtubeData.ts'
import type { ImportError } from '../api/youtubeData.ts'
import CandidateTable from '../components/CandidateTable.tsx'
import DataApiNotice from '../components/DataApiNotice.tsx'
import SongForm from '../components/SongForm.tsx'
import UrlInputForm from '../components/UrlInputForm.tsx'
import VideoSearchForm from '../components/VideoSearchForm.tsx'
import { useNotice } from '../context/NoticeContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { evaluateCandidates } from '../lib/candidates.ts'
import { parseDescription } from '../lib/chapterParser.ts'
import { normalize } from '../lib/hangul.ts'
import { formatTime } from '../lib/time.ts'
import type { ImportCandidate, SongDraft, SongFields, SongKind, VideoInfo } from '../types.ts'

type ImportPhase =
  | { phase: 'input'; error: ImportError | null }
  | { phase: 'loading' }
  | { phase: 'review'; video: VideoInfo; candidates: ImportCandidate[]; saving: boolean }
  | { phase: 'single'; video: VideoInfo; saving: boolean }

type Tab = 'url' | 'search'

const KIND_ORDER: { kind: SongKind; label: string }[] = [
  { kind: 'player', label: '선수' },
  { kind: 'situation', label: '상황' },
  { kind: 'team', label: '팀 응원가' },
]

export default function ImportPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs, addSong, importSongs } = useSongs()
  const { notify } = useNotice()
  const [phase, setPhase] = useState<ImportPhase>({ phase: 'input', error: null })
  const [tab, setTab] = useState<Tab>('url')
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  if (!team) return <p>팀을 먼저 선택해 주세요</p>

  const availability = dataApiAvailability()
  const teamSongs = songs.filter((s) => s.teamId === team.id)

  async function onSubmit(videoId: string) {
    requestRef.current?.abort()
    const ctrl = new AbortController()
    requestRef.current = ctrl
    setPhase({ phase: 'loading' })
    const r = await fetchVideo(videoId, ctrl.signal)
    if (requestRef.current !== ctrl) return
    if (!r.ok) {
      if (r.error === 'aborted') return
      setPhase({ phase: 'input', error: r.error })
      return
    }
    const video = r.data
    if (!video.embeddable) {
      setPhase({ phase: 'input', error: 'notEmbeddable' })
      return
    }
    if (video.duration === 0) {
      setPhase({ phase: 'input', error: 'live' })
      return
    }
    if (video.ageRestricted) {
      setPhase({ phase: 'input', error: 'ageRestricted' })
      return
    }
    const candidates = parseDescription(video.description)
    if (candidates.length === 0) setPhase({ phase: 'single', video, saving: false })
    else setPhase({ phase: 'review', video, candidates, saving: false })
  }

  function backToInput() {
    requestRef.current?.abort()
    requestRef.current = null
    setPhase({ phase: 'input', error: null })
  }

  function changeCandidate(
    key: number,
    patch: Partial<Pick<ImportCandidate, 'kind' | 'title' | 'startText' | 'selection'>>,
  ) {
    setPhase((p) =>
      p.phase === 'review'
        ? { ...p, candidates: p.candidates.map((c) => (c.key === key ? { ...c, ...patch } : c)) }
        : p,
    )
  }

  function renderReview(p: Extract<ImportPhase, { phase: 'review' }>) {
    const rows = evaluateCandidates(p.candidates, p.video, teamSongs)
    const saving = rows.filter((r) => r.willSave)
    const counts = KIND_ORDER.map(({ kind, label }) => `${label} ${saving.filter((r) => r.kind === kind).length}`)

    function save() {
      setPhase({ ...p, saving: true })
      const drafts: SongDraft[] = []
      for (const r of saving) {
        if (r.start === null || r.end === null || team === null) continue
        drafts.push({
          teamId: team.id,
          kind: r.kind,
          title: r.title.trim(),
          videoId: p.video.videoId,
          videoDuration: p.video.duration,
          start: r.start,
          end: r.end,
          cheerStart: null,
        })
      }
      const n = importSongs(drafts)
      notify(`${n}곡을 저장했습니다`)
      navigate(`/team/${team?.id}`)
    }

    return (
      <>
        <VideoSummary video={p.video} />
        <p className="import-summary">
          {counts.join(' · ')} / 저장 {saving.length}곡
        </p>
        <CandidateTable
          rows={rows}
          videoId={p.video.videoId}
          disabled={p.saving}
          onChange={changeCandidate}
        />
        <div className="button-row">
          <button type="button" disabled={saving.length === 0 || p.saving} onClick={save}>
            저장
          </button>
          <button type="button" disabled={p.saving} onClick={backToInput}>
            취소
          </button>
        </div>
      </>
    )
  }

  function renderSingle(p: Extract<ImportPhase, { phase: 'single' }>) {
    const { video } = p
    function submit(fields: SongFields) {
      if (team === null) return
      setPhase({ ...p, saving: true })
      addSong({
        teamId: team.id,
        kind: fields.kind,
        title: fields.title,
        videoId: video.videoId,
        videoDuration: video.duration,
        start: fields.start,
        end: fields.end,
        cheerStart: fields.cheerStart,
      })
      notify('1곡을 저장했습니다')
      navigate(`/team/${team.id}`)
    }
    const situationTitles = new Set(
      teamSongs.filter((s) => s.kind === 'situation').map((s) => normalize(s.title)),
    )
    return (
      <>
        <VideoSummary video={video} />
        <p>설명란에서 챕터를 찾지 못했습니다. 곡 한 개로 등록합니다</p>
        <SongForm
          initial={{
            title: video.title.slice(0, 30),
            kind: 'situation',
            startText: '00:00',
            endText: formatTime(video.duration),
            cheerStartText: '',
          }}
          videoId={video.videoId}
          videoDuration={video.duration}
          isDuplicateSituationTitle={(title) => situationTitles.has(normalize(title))}
          submitLabel="저장"
          onSubmit={submit}
          onCancel={backToInput}
        />
      </>
    )
  }

  function renderInput(error: ImportError | null, loading: boolean) {
    const disabled = !availability.ok || loading
    return (
      <>
        {!availability.ok && <DataApiNotice reason={availability.error} />}
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'url'} onClick={() => setTab('url')}>
            URL로 가져오기
          </button>
          <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
            YouTube 검색
          </button>
        </div>
        {error && <p className="form-error">{errorMessage(error)}</p>}
        {tab === 'url' ? (
          <UrlInputForm disabled={disabled} onSubmit={onSubmit} />
        ) : (
          <VideoSearchForm disabled={disabled} onPick={onSubmit} />
        )}
        {loading && (
          <div className="button-row">
            <p role="status">불러오는 중...</p>
            <button type="button" onClick={backToInput}>
              취소
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="import-page">
      <h2>곡 가져오기 · {team.fullName}</h2>
      {phase.phase === 'input' && renderInput(phase.error, false)}
      {phase.phase === 'loading' && renderInput(null, true)}
      {phase.phase === 'review' && renderReview(phase)}
      {phase.phase === 'single' && renderSingle(phase)}
    </section>
  )
}

function VideoSummary({ video }: { video: VideoInfo }) {
  return (
    <div className="video-summary">
      <strong>{video.title}</strong>
      <span>
        {video.channelTitle} · {formatTime(video.duration)}
      </span>
    </div>
  )
}
