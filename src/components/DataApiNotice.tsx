//20241476-김도훈-(2026-11-15)
import { errorMessage } from '../api/youtubeData.ts'
import StatusMessage from './StatusMessage.tsx'

export default function DataApiNotice({ reason }: { reason: 'noKey' | 'lanHost' }) {
  return <StatusMessage tone="info">{errorMessage(reason)}</StatusMessage>
}
