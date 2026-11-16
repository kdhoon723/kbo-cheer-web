//20241476-김도훈-(2026-11-15)
import type { RefObject } from 'react'
import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  inputRef: RefObject<HTMLInputElement | null>
  onFocus?: () => void
  onBlur?: () => void
  /** 화면 읽기용 이름. 응원 화면은 「곡 검색」 */
  label?: string
  /** 「/」 단축키 표시. 단축키가 있는 응원 화면에서만 */
  shortcut?: boolean
}

export default function SearchBox({ value, onChange, inputRef, onFocus, onBlur, label = '곡 검색', shortcut = true }: Props) {
  return (
    <div className="search-field">
      <Search className="search-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
      <input
        ref={inputRef}
        className="search-box"
        type="search"
        value={value}
        placeholder="초성이나 이름으로 찾기"
        aria-label={label}
        aria-keyshortcuts={shortcut ? '/' : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {shortcut && (
        <kbd className="search-key" aria-hidden="true">
          /
        </kbd>
      )}
    </div>
  )
}
