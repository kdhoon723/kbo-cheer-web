//20241476-김도훈-(2026-11-15)
import { Link, useNavigate } from 'react-router-dom'
import SongRow from '../components/SongRow.tsx'
import { useNotice } from '../context/NoticeContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import type { Song, SongKind } from '../types.ts'

const GROUPS: { kind: SongKind; label: string }[] = [
  { kind: 'player', label: '선수' },
  { kind: 'situation', label: '상황' },
  { kind: 'team', label: '팀 응원가' },
]

export default function SongListPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const { songs, deleteSong } = useSongs()
  const { notify } = useNotice()

  if (!team) return <p>팀을 먼저 선택해 주세요</p>
  const teamId = team.id
  const teamSongs = songs.filter((s) => s.teamId === teamId)

  function onDelete(song: Song) {
    if (!window.confirm(`'${song.title}'을(를) 삭제합니다`)) return
    deleteSong(song.id)
    notify(`${song.title}을(를) 삭제했습니다`)
  }

  return (
    <section className="song-list-page">
      <h2>곡 관리 · {team.fullName}</h2>
      {teamSongs.length === 0 ? (
        <div className="empty-state">
          <p>이 팀에는 곡이 없습니다</p>
          <Link className="link-button" to={`/team/${teamId}/import`}>
            곡 가져오기
          </Link>
        </div>
      ) : (
        GROUPS.map(({ kind, label }) => {
          const group = teamSongs.filter((s) => s.kind === kind).sort((a, b) => a.order - b.order)
          return (
            <div key={kind} className="song-group">
              <h3>
                {label} ({group.length})
              </h3>
              <ul className="song-rows">
                {group.map((s) => (
                  <SongRow
                    key={s.id}
                    song={s}
                    onEdit={(id) => navigate(`/team/${teamId}/songs/${id}/edit`)}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </div>
          )
        })
      )}
    </section>
  )
}
