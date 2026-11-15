//20241476-김도훈-(2026-11-15)
import type { Song } from '../types.ts'

interface Props {
  songs: Song[]
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

export default function SituationBar({ songs, nowPlayingId, onPlay }: Props) {
  if (songs.length === 0) return null
  return (
    <div className="situation-bar" role="group" aria-label="상황 응원가">
      {songs.map((song, i) => {
        const playing = song.id === nowPlayingId
        return (
          <button
            key={song.id}
            type="button"
            className={playing ? 'play-btn situation-btn is-playing' : 'play-btn situation-btn'}
            aria-pressed={playing}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPlay(song)}
          >
            {i < 9 && <small className="situation-index">{i + 1}</small>}
            {song.title}
          </button>
        )
      })}
    </div>
  )
}
