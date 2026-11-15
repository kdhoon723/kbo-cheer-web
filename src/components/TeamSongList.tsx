//20241476-김도훈-(2026-11-15)
import type { Song } from '../types.ts'

interface Props {
  songs: Song[]
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

export default function TeamSongList({ songs, nowPlayingId, onPlay }: Props) {
  if (songs.length === 0) return null
  return (
    <section>
      <div className="section-head">
        <h2>팀 응원가</h2>
      </div>
      <div className="team-song-list">
        {songs.map((song) => {
          const playing = song.id === nowPlayingId
          return (
            <button
              key={song.id}
              type="button"
              className={playing ? 'play-btn is-playing' : 'play-btn'}
              aria-pressed={playing}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPlay(song)}
            >
              {song.title}
            </button>
          )
        })}
      </div>
    </section>
  )
}
