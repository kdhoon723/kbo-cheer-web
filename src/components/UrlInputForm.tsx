//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../api/youtubeData.ts'
import { extractVideoId } from '../lib/youtubeUrl.ts'
import StatusMessage from './StatusMessage.tsx'

interface Props {
  disabled: boolean
  onSubmit: (videoId: string) => void
}

export default function UrlInputForm({ disabled, onSubmit }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const videoId = extractVideoId(text)
    if (videoId === null) {
      setError(errorMessage('badUrl'))
      return
    }
    setError(null)
    onSubmit(videoId)
  }

  return (
    <form className="import-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>YouTube 영상 주소</span>
        <input
          type="text"
          inputMode="url"
          value={text}
          disabled={disabled}
          placeholder="https://www.youtube.com/watch?v=..."
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <button type="submit" className="primary-btn" disabled={disabled}>
        불러오기
      </button>
    </form>
  )
}
