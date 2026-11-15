//20241476-김도훈-(2026-11-15)
import { useParams } from 'react-router-dom'
import ScreenStub from '../components/ScreenStub.tsx'

export default function SongEditPage() {
  const { songId } = useParams()
  return (
    <>
      <ScreenStub title="곡 수정" />
      <p>곡 ID: {songId}</p>
    </>
  )
}
