//20241476-김도훈-(2026-11-15)
import { Link, useNavigate, useParams } from 'react-router-dom'
import SongForm from '../components/SongForm.tsx'
import { useNotice } from '../context/NoticeContext.tsx'
import { usePlayer } from '../context/PlayerContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { normalize } from '../lib/hangul.ts'
import { formatTime } from '../lib/time.ts'
import type { Song, SongFields } from '../types.ts'

export default function SongEditPage() {
  const { songId } = useParams()
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs, updateSong } = useSongs()
  const { play } = usePlayer()
  const { notify } = useNotice()

  if (!team) return <p>팀을 먼저 선택해 주세요</p>
  const listPath = `/team/${team.id}/songs`
  const song = songs.find((s) => s.id === songId && s.teamId === team.id)

  if (!song) {
    return (
      <section>
        <p>곡을 찾을 수 없습니다</p>
        <Link className="link-button" to={listPath}>
          곡 관리로 돌아가기
        </Link>
      </section>
    )
  }

  const current = song
  const situationTitles = new Set(
    songs
      .filter((s) => s.teamId === current.teamId && s.kind === 'situation' && s.id !== current.id)
      .map((s) => normalize(s.title)),
  )

  function merge(fields: SongFields): Song {
    return { ...current, ...fields, cheerStart: fields.kind === 'player' ? fields.cheerStart : null }
  }

  function submit(fields: SongFields) {
    updateSong(merge(fields))
    notify('저장했습니다')
    navigate(listPath)
  }

  return (
    <section className="song-edit-page">
      <h2>곡 수정 · {team.fullName}</h2>
      <SongForm
        key={current.id}
        initial={{
          title: current.title,
          kind: current.kind,
          startText: formatTime(current.start),
          endText: formatTime(current.end),
          cheerStartText: current.cheerStart === null ? '' : formatTime(current.cheerStart),
        }}
        videoId={current.videoId}
        videoDuration={current.videoDuration}
        isDuplicateSituationTitle={(title) => situationTitles.has(normalize(title))}
        submitLabel="저장"
        onSubmit={submit}
        onPreview={(fields) => play(merge(fields))}
        onCancel={() => navigate(listPath)}
      />
    </section>
  )
}
