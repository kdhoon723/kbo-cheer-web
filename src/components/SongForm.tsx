//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { validateSongForm } from '../lib/songValidation.ts'
import { stepTimeText } from '../lib/songEdit.ts'
import type { SongFields, SongFormValues } from '../types.ts'
import KindToggle from './KindToggle.tsx'
import TimeField from './TimeField.tsx'

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
      <KindToggle
        value={values.kind}
        onChange={(kind) => setValues((v) => ({ ...v, kind, cheerStartText: kind === 'player' ? v.cheerStartText : '' }))}
      />
      <TimeField
        label="시작"
        value={values.startText}
        onChange={(t) => set('startText', t)}
        onStep={(d) => set('startText', stepTimeText(values.startText, d, videoDuration))}
        error={errors.startText && <FieldError>{errors.startText}</FieldError>}
      />
      {values.kind === 'player' && (
        <TimeField
          label="응원가 시작"
          value={values.cheerStartText}
          hint="비워도 됩니다"
          onChange={(t) => set('cheerStartText', t)}
          onStep={(d) => set('cheerStartText', stepTimeText(values.cheerStartText || values.startText, d, videoDuration))}
          error={errors.cheerStartText && <FieldError>{errors.cheerStartText}</FieldError>}
        />
      )}
      <TimeField
        label="끝"
        value={values.endText}
        onChange={(t) => set('endText', t)}
        onStep={(d) => set('endText', stepTimeText(values.endText, d, videoDuration))}
        error={errors.endText && <FieldError>{errors.endText}</FieldError>}
      />
      <div className="edit-actions">
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
