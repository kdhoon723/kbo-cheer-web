//20241476-김도훈-(2026-11-15)
import { useId } from 'react'
import { ChevronDown, ExternalLink, TriangleAlert } from 'lucide-react'
import * as m from 'motion/react-m'
import { getTeam } from '../data/teams.ts'
import { stepTimeText } from '../lib/songEdit.ts'
import { SONG_TABS } from '../lib/songList.ts'
import { formatTime } from '../lib/time.ts'
import type { CandidateRow, ImportCandidate, SongKind, TeamId } from '../types.ts'
import { listItemMotion } from '../ui/motionTokens.ts'
import KindToggle from './KindToggle.tsx'
import TeamLogo from './TeamLogo.tsx'
import TimeField from './TimeField.tsx'

type Patch = Partial<Pick<ImportCandidate, 'kind' | 'title' | 'startText' | 'selection'>>

interface Props {
  /** 지금 필터에 맞는 후보만 */
  rows: CandidateRow[]
  /** 「YouTube에서 그 시각 열기」의 앞 줄 시각을 찾을 때 쓰는 전체 후보 */
  allRows: CandidateRow[]
  videoId: string
  videoDuration: number
  /** 여러 구단 영상이면 줄마다 구단 로고. 한 팀 영상이면 null */
  teamId: TeamId | null
  open: ReadonlySet<number>
  onToggle: (key: number) => void
  onChange: (key: number, patch: Patch) => void
  disabled: boolean
}

const KIND_LABELS = new Map<SongKind, string>(SONG_TABS.map((t) => [t.kind, t.label]))

function openSeconds(rows: CandidateRow[], key: number): number {
  const index = rows.findIndex((r) => r.key === key)
  for (let i = index - 1; i >= 0; i--) {
    const r = rows[i]
    if (r.warning === null && r.start !== null) return r.start
  }
  return 0
}

/**
 * 가져오기 확인 단계 후보 [STEP 3-㉔]. 한 줄 요약(저장 여부, 종류, 이름, 시각, 상태)만 보이고,
 * 줄을 누르면 그 후보만 펼쳐 종류·이름·시작을 고친다. 경고가 있는 후보는 처음부터 펼쳐 둔다.
 * 펼친 칸은 곡 수정 화면과 같은 부품(종류 버튼 셋, 시각 칸)과 같은 이름표를 쓴다 [STEP 3-㉖]
 */
export default function CandidateTable({ rows, allRows, videoId, videoDuration, teamId, open, onToggle, onChange, disabled }: Props) {
  return (
    <ul className="candidates">
      {rows.map((row, i) => {
        const isOpen = open.has(row.key)
        const editId = `candidate-edit-${row.key}`
        return (
          <m.li
            key={row.key}
            className={['candidate', row.warning && 'candidate-warning', isOpen && 'is-open'].filter(Boolean).join(' ')}
            {...listItemMotion(i)}
          >
            <div className="candidate-line">
              <label className="candidate-check">
                <input
                  type="checkbox"
                  aria-label={`저장: ${row.title || '이름 없음'}`}
                  checked={row.willSave}
                  disabled={disabled || !row.selectable}
                  onChange={(e) => onChange(row.key, { selection: e.target.checked ? 'on' : 'off' })}
                />
              </label>
              <button
                type="button"
                className="candidate-toggle"
                aria-expanded={isOpen}
                aria-controls={editId}
                onClick={() => onToggle(row.key)}
              >
                <span className="candidate-main">
                  {teamId && (
                    <>
                      <TeamLogo teamId={row.teamId ?? teamId} size={28} />
                      <span className="visually-hidden">{getTeam(row.teamId ?? teamId).name}</span>
                    </>
                  )}
                  <span className="candidate-kind">{KIND_LABELS.get(row.kind)}</span>
                  <span className="candidate-name">{row.title || '이름 없음'}</span>
                </span>
                <span className="candidate-sub">
                  <span className="candidate-time">{row.startText}</span>
                  <span className="candidate-end">끝 {row.end === null ? '-' : formatTime(row.end)}</span>
                  {row.warning && <span className="badge badge-error">시각 확인</span>}
                  {row.titleError && <span className="badge badge-error">{row.titleError}</span>}
                  {row.duplicate && <span className="badge">같은 상황 곡 있음(저장 안 함)</span>}
                  {row.otherTeam && <span className="badge">다른 구단(저장 안 함)</span>}
                  {row.existing && <span className="badge">이미 있음</span>}
                  {row.sameNamePlayer && <span className="badge">같은 이름 있음</span>}
                </span>
                <ChevronDown className="candidate-chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            {isOpen && (
              <div className="candidate-edit" id={editId}>
                <KindToggle value={row.kind} disabled={disabled} onChange={(kind) => onChange(row.key, { kind })} />
                <TitleField value={row.title} disabled={disabled} onChange={(title) => onChange(row.key, { title })} />
                <TimeField
                  label="시작"
                  value={row.startText}
                  disabled={disabled}
                  onChange={(startText) => onChange(row.key, { startText })}
                  onStep={(d) => onChange(row.key, { startText: stepTimeText(row.startText, d, videoDuration) })}
                  note={`끝 ${row.end === null ? '-' : formatTime(row.end)} · 다음 챕터 시각으로 정합니다`}
                />
                {row.warning && (
                  <div className="candidate-warn-detail">
                    <code>{row.rawLine}</code>
                    <p>
                      <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                      시각이 앞뒤 줄과 맞지 않습니다. 영상에서 확인해 고쳐 주세요
                    </p>
                    <a
                      href={`https://www.youtube.com/watch?v=${videoId}&t=${openSeconds(allRows, row.key)}s`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      YouTube에서 그 시각 열기
                      <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </m.li>
        )
      })}
    </ul>
  )
}

function TitleField({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (title: string) => void }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>이름</label>
      <input id={id} type="text" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
