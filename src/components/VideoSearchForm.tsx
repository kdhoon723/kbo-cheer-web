//20241476-김도훈-(2026-11-15)
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage, searchVideos } from '../api/youtubeData.ts'
import type { DataApiError } from '../api/youtubeData.ts'
import type { VideoSearchItem } from '../types.ts'
import StatusMessage from './StatusMessage.tsx'

interface Props {
  disabled: boolean
  onPick: (videoId: string) => void
}

export default function VideoSearchForm({ disabled, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoSearchItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<DataApiError | null>(null)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q === '') return
    requestRef.current?.abort()
    const ctrl = new AbortController()
    requestRef.current = ctrl
    setLoading(true)
    setError(null)
    const r = await searchVideos(q, ctrl.signal)
    if (requestRef.current !== ctrl) return
    setLoading(false)
    if (!r.ok) {
      if (r.error === 'aborted') return
      setResults(null)
      setError(r.error)
      return
    }
    setResults(r.data)
  }

  return (
    <div className="import-form">
      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>검색어</span>
          <input
            type="search"
            value={query}
            disabled={disabled}
            placeholder="예: 한화 이글스 응원가 모음"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="submit" disabled={disabled || loading || query.trim() === ''}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>
      {error && <StatusMessage tone="error">{errorMessage(error)}</StatusMessage>}
      {results !== null && results.length === 0 && <StatusMessage tone="empty">검색 결과가 없습니다</StatusMessage>}
      {results !== null && results.length > 0 && (
        <ul className="search-results">
          {results.map((item) => (
            <li key={item.videoId}>
              <button
                type="button"
                className="search-result"
                disabled={disabled}
                onClick={() => onPick(item.videoId)}
              >
                {item.thumbnailUrl !== '' && <img src={item.thumbnailUrl} alt="" width={120} height={90} />}
                <span className="search-result-text">
                  <strong>{item.title}</strong>
                  <span>{item.channelTitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
