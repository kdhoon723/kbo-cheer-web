//20241476-김도훈-(2026-11-15)
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { dataApiAvailability, errorMessage, fetchVideo } from '../api/youtubeData.ts'
import type { ImportError } from '../api/youtubeData.ts'
import CandidateTable from '../components/CandidateTable.tsx'
import DataApiNotice from '../components/DataApiNotice.tsx'
import SongForm from '../components/SongForm.tsx'
import StatusMessage from '../components/StatusMessage.tsx'
import TeamSplitNotice from '../components/TeamSplitNotice.tsx'
import UrlInputForm from '../components/UrlInputForm.tsx'
import VideoSearchForm from '../components/VideoSearchForm.tsx'
import { useNotice } from '../context/NoticeContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { useSeedSongs } from '../hooks/useSeedSongs.ts'
import { evaluateCandidates } from '../lib/candidates.ts'
import type { TeamScope } from '../lib/candidates.ts'
import {
  CANDIDATE_FILTERS,
  bulkSelection,
  kindTargets,
  matchesFilter,
  reviewCounts,
  savedNotice,
  savedTab,
  teamVideoId,
  withKind,
} from '../lib/importReview.ts'
import type { CandidateFilter, KindScope, TeamCount } from '../lib/importReview.ts'
import { SONG_TABS, songListPath } from '../lib/songList.ts'
import { parseDescription } from '../lib/chapterParser.ts'
import { splitTeamPrefixes } from '../lib/teamPrefix.ts'
import { normalize } from '../lib/hangul.ts'
import { formatTime } from '../lib/time.ts'
import type { ImportCandidate, SongDraft, SongFields, SongKind, VideoInfo } from '../types.ts'

type ImportPhase =
  | { phase: 'input'; error: ImportError | null }
  | { phase: 'loading' }
  | {
      phase: 'review'
      video: VideoInfo
      candidates: ImportCandidate[]
      saving: boolean
      filter: CandidateFilter
      /** 펼친 후보. 처음에는 경고가 있는 후보 */
      open: ReadonlySet<number>
      /** 여러 구단 영상이면 구단별 곡 수, 아니면 null [STEP 3-㉖] */
      teams: TeamCount[] | null
      /** 여러 구단 영상을 구단별로 나눠 넣는가. 처음에는 false(이 팀 곡만) */
      split: boolean
      kindScope: KindScope
    }
  | { phase: 'single'; video: VideoInfo; saving: boolean }

type Tab = 'url' | 'search'

const KIND_TO: Record<SongKind, string> = { player: '선수로', situation: '상황으로', team: '팀 응원가로' }

export default function ImportPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs, addSong, importSongs } = useSongs()
  const seed = useSeedSongs()
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
    const parsed = parseDescription(video.description)
    if (parsed.length === 0) {
      setPhase({ phase: 'single', video, saving: false })
      return
    }
    const multi = splitTeamPrefixes(parsed, songs)
    const candidates = multi?.candidates ?? parsed
    const teams = multi?.teams ?? null
    const first = evaluateCandidates(candidates, video, teamSongs, scopeOf(teams, false))
    const open = new Set(first.filter((r) => r.warning !== null || r.titleError !== null).map((r) => r.key))
    setPhase({ phase: 'review', video, candidates, saving: false, filter: 'all', open, teams, split: false, kindScope: 'checked' })
  }

  function scopeOf(teams: TeamCount[] | null, split: boolean): TeamScope | null {
    return teams && team ? { teamId: team.id, songs, split } : null
  }

  // 확인 단계와 영상 하나 등록에서 취소하면 곡 관리 목록으로 돌아간다. 불러오는 중의 취소는 입력 단계로만 돌아간다
  function backToList() {
    navigate(`/team/${team?.id}/songs`)
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

  function setSelections(changes: { key: number; selection: ImportCandidate['selection'] }[]) {
    const byKey = new Map(changes.map((c) => [c.key, c.selection]))
    setPhase((p) =>
      p.phase === 'review'
        ? { ...p, candidates: p.candidates.map((c) => (byKey.has(c.key) ? { ...c, selection: byKey.get(c.key) ?? c.selection } : c)) }
        : p,
    )
  }

  function toggleOpen(key: number) {
    setPhase((p) => {
      if (p.phase !== 'review') return p
      const open = new Set(p.open)
      if (open.has(key)) open.delete(key)
      else open.add(key)
      return { ...p, open }
    })
  }

  function renderReview(p: Extract<ImportPhase, { phase: 'review' }>) {
    const rows = evaluateCandidates(p.candidates, p.video, teamSongs, scopeOf(p.teams, p.split))
    const saving = rows.filter((r) => r.willSave)
    const counts = SONG_TABS.map(({ kind, label }) => `${label} ${saving.filter((r) => r.kind === kind).length}`)
    const status = reviewCounts(rows)
    const otherTeams = rows.filter((r) => r.otherTeam).length
    const visible = rows.filter((r) => matchesFilter(r, p.filter))
    const kindKeys = kindTargets(rows, visible, p.kindScope)

    function changeKinds(kind: SongKind) {
      setPhase({ ...p, candidates: withKind(p.candidates, kindKeys, kind) })
      notify(`${kindKeys.length}곡을 ${KIND_TO[kind]} 바꿨습니다`)
    }

    function save() {
      setPhase({ ...p, saving: true })
      const drafts: SongDraft[] = []
      for (const r of saving) {
        if (r.start === null || r.end === null || team === null) continue
        drafts.push({
          // 「이 팀 곡만」이면 다른 구단 곡은 고를 수 없어 여기 오지 않는다
          teamId: r.teamId ?? team.id,
          kind: r.kind,
          title: r.title.trim(),
          videoId: p.video.videoId,
          videoDuration: p.video.duration,
          start: r.start,
          end: r.end,
          cheerStart: null,
        })
      }
      importSongs(drafts)
      notify(savedNotice(drafts))
      // 지금 팀 곡 관리로 돌아와 새로 들어온 곡이 있는 탭을 보여 준다(지금 팀 곡이 없으면 넣은 곡 전체 기준)
      if (!team) return
      const own = drafts.filter((d) => d.teamId === team.id)
      navigate(songListPath(team.id, '', savedTab((own.length > 0 ? own : drafts).map((d) => d.kind))))
    }

    return (
      <>
        <VideoSummary video={p.video} />
        {p.teams && team && (
          <TeamSplitNotice
            teams={p.teams}
            team={team}
            split={p.split}
            disabled={p.saving}
            onSplit={(split) => setPhase({ ...p, split })}
          />
        )}
        <p className="review-counts">
          새 곡 {status.new} · 이미 있음 {status.existing} · 경고 {status.warning}
          {otherTeams > 0 && ` · 다른 구단 ${otherTeams}`}
        </p>
        {status.new === 0 && (
          <StatusMessage tone="empty">
            {status.warning > 0
              ? `새로 넣을 곡이 없습니다. 경고 ${status.warning}곡은 시각이나 이름을 고치면 다시 판단합니다`
              : '새로 넣을 곡이 없습니다. 이 영상의 곡은 모두 이 팀에 이미 있습니다'}
          </StatusMessage>
        )}
        <div className="review-tools">
          <div className="filter-group" role="group" aria-label="후보 거르기">
            {CANDIDATE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={p.filter === f.value}
                onClick={() => setPhase({ ...p, filter: f.value })}
              >
                {f.label} <span className="count">{status[f.value]}</span>
              </button>
            ))}
          </div>
          <div className="bulk-actions">
            <button type="button" className="plain-btn" disabled={p.saving} onClick={() => setSelections(bulkSelection(visible, true))}>
              전체 선택
            </button>
            <button type="button" className="plain-btn" disabled={p.saving} onClick={() => setSelections(bulkSelection(visible, false))}>
              전체 해제
            </button>
          </div>
        </div>
        {/* 고른 곡·보이는 곡이 대상이라 필터·전체 선택 바로 아래에 둔다. 늘 보여 목록이 밀리지 않는다 */}
        <div className="kind-bulk">
          <span className="kind-bulk-label" id="kind-bulk-label">
            종류 한꺼번에 바꾸기
          </span>
          <div className="choice-toggle" role="group" aria-label="바꿀 곡">
            <button type="button" aria-pressed={p.kindScope === 'checked'} disabled={p.saving} onClick={() => setPhase({ ...p, kindScope: 'checked' })}>
              고른 곡 <span className="count">{saving.length}</span>
            </button>
            <button type="button" aria-pressed={p.kindScope === 'visible'} disabled={p.saving} onClick={() => setPhase({ ...p, kindScope: 'visible' })}>
              보이는 곡 <span className="count">{visible.length}</span>
            </button>
          </div>
          <div className="kind-bulk-actions" role="group" aria-labelledby="kind-bulk-label">
            {SONG_TABS.map(({ kind }) => (
              <button key={kind} type="button" disabled={p.saving || kindKeys.length === 0} onClick={() => changeKinds(kind)}>
                {KIND_TO[kind]}
              </button>
            ))}
          </div>
        </div>
        <p className="import-summary">
          {counts.join(' · ')} / 저장 {saving.length}곡
        </p>
        {visible.length === 0 ? (
          <StatusMessage tone="empty">이 조건에 맞는 후보가 없습니다</StatusMessage>
        ) : (
          <CandidateTable
            rows={visible}
            allRows={rows}
            videoId={p.video.videoId}
            videoDuration={p.video.duration}
            teamId={p.teams && team ? team.id : null}
            open={p.open}
            onToggle={toggleOpen}
            disabled={p.saving}
            onChange={changeCandidate}
          />
        )}
        <div className="review-actions">
          <button type="button" className="primary-btn" disabled={saving.length === 0 || p.saving} onClick={save}>
            {saving.length}곡 저장
          </button>
          <button type="button" disabled={p.saving} onClick={backToList}>
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
      navigate(`/team/${team.id}/songs`)
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
          onCancel={backToList}
        />
      </>
    )
  }

  function renderInput(error: ImportError | null, loading: boolean) {
    const disabled = !availability.ok || loading
    const videoId = team && seed ? teamVideoId(seed, team.id) : null
    return (
      <>
        {!availability.ok && <DataApiNotice reason={availability.error} />}
        <p className="import-guide">
          설명란에 곡마다 시각(챕터)이 적힌 모음 영상이면 곡별로 나눠 가져옵니다. 챕터가 없는 영상은 한 곡으로 넣습니다.
        </p>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'url'} onClick={() => setTab('url')}>
            URL로 가져오기
          </button>
          <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>
            YouTube 검색
          </button>
        </div>
        {error && <StatusMessage tone="error">{errorMessage(error)}</StatusMessage>}
        {tab === 'url' ? (
          <UrlInputForm
            disabled={disabled}
            onSubmit={onSubmit}
            presetUrl={videoId ? `https://www.youtube.com/watch?v=${videoId}` : null}
          />
        ) : (
          <VideoSearchForm disabled={disabled} onPick={onSubmit} />
        )}
        {loading && (
          <StatusMessage
            tone="loading"
            action={
              <button type="button" onClick={backToInput}>
                취소
              </button>
            }
          >
            불러오는 중...
          </StatusMessage>
        )}
      </>
    )
  }

  return (
    <section className="import-page">
      <Link className="back-link" to={`/team/${team.id}/songs`}>
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        곡 관리
      </Link>
      <h2>곡 추가 · {team.fullName}</h2>
      <ImportSteps current={phase.phase === 'input' || phase.phase === 'loading' ? 1 : phase.saving ? 3 : 2} />
      {phase.phase === 'input' && renderInput(phase.error, false)}
      {phase.phase === 'loading' && renderInput(null, true)}
      {phase.phase === 'review' && renderReview(phase)}
      {phase.phase === 'single' && renderSingle(phase)}
    </section>
  )
}

const STEPS = ['주소', '확인', '저장'] as const

/** 「1 주소 → 2 확인 → 3 저장」. 지금 단계는 반전, 지난 단계는 흐린 글자 */
function ImportSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="import-steps" aria-label="곡 추가 단계">
      {STEPS.map((label, i) => {
        const n = i + 1
        return (
          <li key={label} className={n === current ? 'is-current' : n < current ? 'is-done' : undefined} aria-current={n === current ? 'step' : undefined}>
            <span className="step-no">{n}</span>
            {label}
          </li>
        )
      })}
    </ol>
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
