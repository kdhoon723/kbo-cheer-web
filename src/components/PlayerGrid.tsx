//20241476-김도훈-(2026-11-15)
import type { Song } from '../types.ts'
import { bandStyle } from './band.ts'

interface Props {
  songs: Song[]
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

export default function PlayerGrid({ songs, nowPlayingId, onPlay }: Props) {
  return (
    <div className="player-grid">
      {songs.map((song) => {
        const playing = song.id === nowPlayingId
        return (
          <button
            key={song.id}
            type="button"
            className={playing ? 'player-cell is-playing' : 'player-cell'}
            style={playing ? bandStyle(song.teamId) : undefined}
            aria-pressed={playing}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPlay(song)}
          >
            {song.title}
          </button>
        )
      })}
    </div>
  )
}
