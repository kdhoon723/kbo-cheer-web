//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { validateSongForm } from '../lib/songValidation.ts'
import type { SongFields, SongFormValues, SongKind } from '../types.ts'

interface Props {
  initial: SongFormValues
  videoId: string
  videoDuration: number
  isDuplicateSituationTitle: (title: string) => boolean
  submitLabel: string
  onSubmit: (fields: SongFields) => void
  onPreview?: (fields: SongFields) => void
  onCancel: () => void
}

const KIND_LABELS: Record<SongKind, string> = {
  player: '선수',
  situation: '상황',
  team: '팀 응원가',
}
const KINDS: SongKind[] = ['player', 'situation', 'team']

function FieldError({ children }: { children: ReactNode }) {
  return (
    <span className="form-error">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </span>
  )
}

export default function SongForm(props: Props) {
  const { initial, videoId, videoDuration, isDuplicateSituationTitle, submitLabel, onSubmit, onPreview, onCancel } = props
  const [values, setValues] = useState<SongFormValues>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof SongFormValues, string>>>({})

  function set<K extends keyof SongFormValues>(key: K, value: SongFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function validated(): SongFields | null {
    const result = validateSongForm(values, videoDuration)
    if (!result.ok) {
      setErrors(result.errors)
      return null
    }
    setErrors({})
    return result.fields
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const fields = validated()
    if (fields) onSubmit(fields)
  }

  function handlePreview() {
    const fields = validated()
    if (fields) onPreview?.(fields)
  }

  const showDuplicate = values.kind === 'situation' && isDuplicateSituationTitle(values.title)

  return (
    <form className="song-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>영상 ID</span>
        <input type="text" value={videoId} readOnly />
      </label>
      <label className="field">
        <span>이름</span>
        <input type="text" value={values.title} onChange={(e) => set('title', e.target.value)} />
        {errors.title && <FieldError>{errors.title}</FieldError>}
        {showDuplicate && (
          <span className="form-warning">
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            같은 제목의 상황 곡이 이미 있습니다. 상황 버튼이 두 개 생깁니다
          </span>
        )}
      </label>
      <label className="field">
        <span>종류</span>
        <select
          value={values.kind}
          onChange={(e) => {
            const kind = KINDS.find((k) => k === e.target.value)
            if (!kind) return
            setValues((v) => ({ ...v, kind, cheerStartText: kind === 'player' ? v.cheerStartText : '' }))
          }}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>시작</span>
        <input type="text" value={values.startText} onChange={(e) => set('startText', e.target.value)} />
        {errors.startText && <FieldError>{errors.startText}</FieldError>}
      </label>
      <label className="field">
        <span>끝</span>
        <input type="text" value={values.endText} onChange={(e) => set('endText', e.target.value)} />
        {errors.endText && <FieldError>{errors.endText}</FieldError>}
      </label>
      <label className="field">
        <span>응원가 시작(선수 곡만, 비워도 됩니다)</span>
        <input
          type="text"
          value={values.cheerStartText}
          disabled={values.kind !== 'player'}
          onChange={(e) => set('cheerStartText', e.target.value)}
        />
        {errors.cheerStartText && <FieldError>{errors.cheerStartText}</FieldError>}
      </label>
      <div className="button-row">
        <button type="submit" className="primary-btn">
          {submitLabel}
        </button>
        {onPreview && (
          <button type="button" onClick={handlePreview}>
            미리 듣기
          </button>
        )}
        <button type="button" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  )
}
