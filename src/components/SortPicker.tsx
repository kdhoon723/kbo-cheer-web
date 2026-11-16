//20241476-김도훈-(2026-11-16)
import { useId, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { TapButton } from '../ui/Press.tsx'
import Sheet from './Sheet.tsx'

export interface SortOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  /** 「선수 정렬」처럼 무엇을 정렬하는지 */
  label: string
  options: readonly SortOption<T>[]
  value: T
  onChange: (sort: T) => void
}

/** 노트북 이상: 탭 줄 오른쪽에 정렬 이름을 모두 늘어놓는다. 휴대폰에서는 CSS가 숨긴다 */
export function SortToggle<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="sort-toggle" role="group" aria-label={label}>
      {options.map((s) => (
        <button key={s.value} type="button" aria-pressed={value === s.value} onClick={() => onChange(s.value)}>
          {s.label}
        </button>
      ))}
    </div>
  )
}

/** 휴대폰 정렬: 탭 줄이 한 줄에 들어가게 지금 정렬 이름만 보이는 버튼으로 접고, 누르면 시트에서 고른다 */
export default function SortPicker<T extends string>({ label, options, value, onChange }: Props<T>) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const current = options.find((s) => s.value === value) ?? options[0]
  return (
    <>
      <TapButton
        type="button"
        className="sort-picker"
        aria-label={`${label}: ${current.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {current.label}
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </TapButton>
      <Sheet
        open={open}
        title={label}
        titleId={titleId}
        focusSelector='[aria-pressed="true"]'
        onClose={() => setOpen(false)}
      >
        <div className="sort-options" role="group" aria-label={label}>
          {options.map((s) => (
            <TapButton
              key={s.value}
              type="button"
              aria-pressed={s.value === value}
              onClick={() => {
                onChange(s.value)
                setOpen(false)
              }}
            >
              {s.label}
              {s.value === value && <Check size={18} strokeWidth={1.75} aria-hidden="true" />}
            </TapButton>
          ))}
        </div>
      </Sheet>
    </>
  )
}
