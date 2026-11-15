//20241476-김도훈-(2026-11-15)
import { getTeam } from '../data/teams.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'

export default function PlayerPanel() {
  const { nowPlaying, stop } = usePlayer()
  const { songs } = useSongs()
  const song = nowPlaying ? songs.find((s) => s.id === nowPlaying.songId) : undefined

  return (
    <aside className="player-panel" aria-label="재생 상태">
      <p className="now-playing">{song ? `▶ ${song.title} [${getTeam(song.teamId).name}]` : '선택한 곡 없음'}</p>
      <button type="button" disabled={!song} onClick={stop}>
        ■ 정지
      </button>
    </aside>
  )
}
