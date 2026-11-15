//20241476-김도훈-(2026-11-15)
import type { Song } from '../types.ts'
import { bandStyle } from './band.ts'
import StatusMessage from './StatusMessage.tsx'

interface Props {
  songs: Song[]
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

export default function TeamSongList({ songs, nowPlayingId, onPlay }: Props) {
  if (songs.length === 0) return <StatusMessage tone="empty">팀 응원가가 없습니다</StatusMessage>
  return (
    <ol className="team-song-list">
      {songs.map((song, i) => {
        const playing = song.id === nowPlayingId
        return (
          <li key={song.id}>
            <button
              type="button"
              className={playing ? 'song-line is-playing' : 'song-line'}
              style={playing ? bandStyle(song.teamId) : undefined}
              aria-pressed={playing}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPlay(song)}
            >
              <span className="song-line-no" aria-hidden="true">
                {i + 1}
              </span>
              <span className="song-line-title">{song.title}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
