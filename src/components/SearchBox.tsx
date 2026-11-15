//20241476-김도훈-(2026-11-15)
import type { RefObject } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}

export default function SearchBox({ value, onChange, inputRef }: Props) {
  return (
    <input
      ref={inputRef}
      className="search-box"
      type="search"
      value={value}
      placeholder="검색: 초성·이름"
      aria-label="곡 검색"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
