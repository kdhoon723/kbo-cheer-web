//20241476-김도훈-(2026-11-15)
import type { GridSort, Song } from '../types.ts'

interface Props {
  songs: Song[]
  sort: GridSort
  onSortChange: (s: GridSort) => void
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

const SORTS: { value: GridSort; label: string }[] = [
  { value: 'chapter', label: '챕터 순' },
  { value: 'name', label: '가나다 순' },
]

export default function PlayerGrid({ songs, sort, onSortChange, nowPlayingId, onPlay }: Props) {
  return (
    <section>
      <div className="section-head">
        <h2>선수</h2>
        <div className="sort-toggle">
          {SORTS.map((s) => (
            <button key={s.value} type="button" aria-pressed={sort === s.value} onClick={() => onSortChange(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="player-grid">
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
