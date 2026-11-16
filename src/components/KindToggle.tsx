//20241476-김도훈-(2026-11-16)
import { useId } from 'react'
import { SONG_TABS } from '../lib/songList.ts'
import type { SongKind } from '../types.ts'

interface Props {
  value: SongKind
  onChange: (kind: SongKind) => void
  disabled?: boolean
}

/** 종류 칸: 이름표 「종류」와 같은 폭 버튼 셋. 곡 수정, 영상 하나 등록, 가져오기 펼친 줄이 같이 쓴다 [STEP 3-㉖] */
export default function KindToggle({ value, onChange, disabled = false }: Props) {
  const id = useId()
  return (
    <div className="field">
      <span id={id}>종류</span>
      <div className="kind-toggle" role="group" aria-labelledby={id}>
        {SONG_TABS.map(({ kind, label }) => (
          <button key={kind} type="button" aria-pressed={value === kind} disabled={disabled} onClick={() => onChange(kind)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
