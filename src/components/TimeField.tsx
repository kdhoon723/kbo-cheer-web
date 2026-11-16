//20241476-김도훈-(2026-11-16)
import { useId } from 'react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  onChange: (text: string) => void
  onStep: (delta: number) => void
  /** 미리 듣는 중일 때만 있다. 재생 위치를 이 칸에 넣는다 */
  onNow: (() => void) | null
  onBlur: () => void
  hint?: string
  error?: ReactNode
}

/** mm:ss 시각 칸. 직접 입력과 −1초·+1초, 미리 듣는 중이면 「지금 위치로」 */
export default function TimeField({ label, value, onChange, onStep, onNow, onBlur, hint, error }: Props) {
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <button type="button" className="step-btn" aria-label={`${label} 1초 앞으로`} onClick={() => onStep(-1)}>
          −1초
        </button>
        <button type="button" className="step-btn" aria-label={`${label} 1초 뒤로`} onClick={() => onStep(1)}>
          +1초
        </button>
        <button type="button" className="now-btn" aria-label={`${label}을 지금 위치로`} disabled={!onNow} onClick={() => onNow?.()}>
          지금 위치로
        </button>
      </div>
      {error}
    </div>
  )
}
