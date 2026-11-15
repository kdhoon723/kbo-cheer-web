//20241476-김도훈-(2026-11-15)
import { ExternalLink, TriangleAlert } from 'lucide-react'
import * as m from 'motion/react-m'
import { formatTime } from '../lib/time.ts'
import type { CandidateRow, ImportCandidate, SongKind } from '../types.ts'
import { listItemMotion } from '../ui/motionTokens.ts'

type Patch = Partial<Pick<ImportCandidate, 'kind' | 'title' | 'startText' | 'selection'>>

interface Props {
  rows: CandidateRow[]
  videoId: string
  onChange: (key: number, patch: Patch) => void
  disabled: boolean
}

const KIND_LABELS: Record<SongKind, string> = {
  player: '선수',
  situation: '상황',
  team: '팀 응원가',
}
const KINDS: SongKind[] = ['player', 'situation', 'team']

function openSeconds(rows: CandidateRow[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    const r = rows[i]
    if (r.warning === null && r.start !== null) return r.start
  }
  return 0
}

export default function CandidateTable({ rows, videoId, onChange, disabled }: Props) {
  return (
    <ul className="candidates">
      {rows.map((row, i) => (
        <m.li
          key={row.key}
          className={row.warning ? 'candidate candidate-warning' : 'candidate'}
          {...listItemMotion(i)}
        >
          <label className="candidate-check">
            <input
              type="checkbox"
              checked={row.willSave}
              disabled={disabled || !row.selectable}
              onChange={(e) => onChange(row.key, { selection: e.target.checked ? 'on' : 'off' })}
            />
            <span>저장</span>
          </label>
          <select
            aria-label="종류"
            value={row.kind}
            disabled={disabled}
            onChange={(e) => {
              const kind = KINDS.find((k) => k === e.target.value)
              if (kind) onChange(row.key, { kind })
            }}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            aria-label="이름"
            className="candidate-title"
            type="text"
            value={row.title}
            disabled={disabled}
            onChange={(e) => onChange(row.key, { title: e.target.value })}
          />
          <input
            aria-label="시작 시각"
            className="candidate-start"
            type="text"
            value={row.startText}
            disabled={disabled}
            onChange={(e) => onChange(row.key, { startText: e.target.value })}
          />
          <span className="candidate-end">끝 {row.end === null ? '-' : formatTime(row.end)}</span>
          <div className="candidate-notes">
            {row.titleError && <span className="badge badge-error">{row.titleError}</span>}
            {row.duplicate && <span className="badge">같은 상황 곡 있음(저장 안 함)</span>}
            {row.existing && <span className="badge">이미 있음</span>}
            {row.sameNamePlayer && <span className="badge">같은 이름 있음</span>}
          </div>
          {row.warning && (
            <div className="candidate-warn-detail">
              <code>{row.rawLine}</code>
              <p>
                <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                시각이 앞뒤 줄과 맞지 않습니다. 영상에서 확인해 고쳐 주세요
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}&t=${openSeconds(rows, i)}s`}
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube에서 그 시각 열기
                <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
          )}
        </m.li>
      ))}
    </ul>
  )
}
