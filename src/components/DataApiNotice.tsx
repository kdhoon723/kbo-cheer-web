//20241476-김도훈-(2026-11-15)
import { errorMessage } from '../api/youtubeData.ts'

export default function DataApiNotice({ reason }: { reason: 'noKey' | 'lanHost' }) {
  return (
    <p className="form-notice" role="status">
      {errorMessage(reason)}
    </p>
  )
}
