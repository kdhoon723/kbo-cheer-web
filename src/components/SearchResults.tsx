//20241476-김도훈-(2026-11-15)
import type { SearchHit } from '../lib/search.ts'
import type { Song } from '../types.ts'

interface Props {
  hits: SearchHit[]
  nowPlayingId: string | null
  onPick: (song: Song) => void
}

export default function SearchResults({ hits, nowPlayingId, onPick }: Props) {
  if (hits.length === 0) return <p className="empty-text">검색 결과가 없습니다</p>
  return (
    <ul className="result-list">
      {hits.map(({ song, team, isCurrentTeam }) => {
        const playing = song.id === nowPlayingId
        return (
          <li key={song.id}>
            <button
              type="button"
              className={playing ? 'play-btn result-btn is-playing' : 'play-btn result-btn'}
              aria-pressed={playing}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(song)}
            >
              {song.title}
              {!isCurrentTeam && <span className="result-team"> [{team.name}]</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
