//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../api/youtubeData.ts'
import { extractVideoId } from '../lib/youtubeUrl.ts'
import StatusMessage from './StatusMessage.tsx'

interface Props {
  disabled: boolean
  onSubmit: (videoId: string) => void
  /** 처음 데이터에 쓴 이 팀 모음 영상 주소. 있으면 「이 팀 기본 모음 영상」 버튼이 칸에 넣는다 */
  presetUrl: string | null
}

export default function UrlInputForm({ disabled, onSubmit, presetUrl }: Props) {
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
      <div className="button-row">
        <button type="submit" className="primary-btn" disabled={disabled}>
          불러오기
        </button>
        {presetUrl && (
          <button type="button" disabled={disabled} onClick={() => setText(presetUrl)}>
            이 팀 기본 모음 영상
          </button>
        )}
      </div>
    </form>
  )
}
