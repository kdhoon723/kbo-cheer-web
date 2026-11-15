//20241476-김도훈-(2026-11-15)
import type { RefObject } from 'react'
import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}

export default function SearchBox({ value, onChange, inputRef }: Props) {
  return (
    <div className="search-field">
      <Search className="search-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
      <input
        ref={inputRef}
        className="search-box"
        type="search"
        value={value}
        placeholder="초성이나 이름으로 찾기"
        aria-label="곡 검색"
        aria-keyshortcuts="/"
        onChange={(e) => onChange(e.target.value)}
      />
      <kbd className="search-key" aria-hidden="true">
        /
      </kbd>
    </div>
  )
}
