//20241476-김도훈-(2026-11-16)
import { useId } from 'react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  onChange: (text: string) => void
  onStep: (delta: number) => void
  /** 재생 위치를 이 칸에 넣는다. null이면 버튼은 있지만 꺼져 있고(미리 듣기 전), 없으면 버튼을 그리지 않는다(미리 듣기가 없는 화면) */
  onNow?: (() => void) | null
  onBlur?: () => void
  hint?: string
  /** 칸 아래 읽기만 하는 한 줄(가져오기 펼친 줄의 끝 시각) */
  note?: ReactNode
  disabled?: boolean
  error?: ReactNode
}

/** mm:ss 시각 칸. 직접 입력과 −1초·+1초, 미리 듣는 화면이면 「지금 위치로」 */
export default function TimeField({ label, value, onChange, onStep, onNow, onBlur, hint, note, disabled = false, error }: Props) {
  const id = useId()
  return (
    <div className="field time-field">
      <label htmlFor={id}>{label}</label>
      <div className="time-row">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={hint}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <button type="button" className="step-btn" aria-label={`${label} 1초 앞으로`} disabled={disabled} onClick={() => onStep(-1)}>
          −1초
        </button>
        <button type="button" className="step-btn" aria-label={`${label} 1초 뒤로`} disabled={disabled} onClick={() => onStep(1)}>
          +1초
        </button>
        {onNow !== undefined && (
          <button type="button" className="now-btn" aria-label={`${label}을 지금 위치로`} disabled={disabled || !onNow} onClick={() => onNow?.()}>
            지금 위치로
          </button>
        )}
      </div>
      {note && <span className="field-note">{note}</span>}
      {error}
    </div>
  )
}
