//20241476-김도훈-(2026-11-16)
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { GRID_SORTS } from '../lib/playerSort.ts'
import type { GridSort } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import Sheet from './Sheet.tsx'

interface Props {
  value: GridSort
  onChange: (sort: GridSort) => void
}

/** 휴대폰 정렬: 탭 줄이 한 줄에 들어가게 지금 정렬 이름만 보이는 버튼으로 접고, 누르면 시트에서 고른다 */
export default function SortPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const current = GRID_SORTS.find((s) => s.value === value) ?? GRID_SORTS[0]
  return (
    <>
      <TapButton
        type="button"
        className="sort-picker"
        aria-label={`선수 정렬: ${current.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {current.label}
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </TapButton>
      <Sheet
        open={open}
        title="선수 정렬"
        titleId="sort-sheet-title"
        focusSelector='[aria-pressed="true"]'
        onClose={() => setOpen(false)}
      >
        <div className="sort-options" role="group" aria-label="선수 정렬">
          {GRID_SORTS.map((s) => (
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
