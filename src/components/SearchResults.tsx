//20241476-김도훈-(2026-11-15)
import { motion } from 'motion/react'
import { useMounted } from '../hooks/useMounted.ts'
import type { SearchHit } from '../lib/search.ts'
import type { Song } from '../types.ts'
import { PressCell } from '../ui/Press.tsx'
import { listItemMotion } from '../ui/motionTokens.ts'
import { bandStyle } from './band.ts'
import StatusMessage from './StatusMessage.tsx'
import TeamLogo from './TeamLogo.tsx'

interface Props {
  hits: SearchHit[]
  nowPlayingId: string | null
  onPick: (song: Song) => void
}

export default function SearchResults({ hits, nowPlayingId, onPick }: Props) {
  // 검색어를 더 칠 때 새로 생기는 줄은 움직이지 않는다
  const mounted = useMounted()
  if (hits.length === 0) return <StatusMessage tone="empty">검색 결과가 없습니다</StatusMessage>
  return (
    <ul className="result-list">
      {hits.map(({ song, team, isCurrentTeam }, i) => {
        const playing = song.id === nowPlayingId
        return (
          <motion.li key={song.id} {...listItemMotion(i, !mounted)}>
            <PressCell
              type="button"
              className={playing ? 'song-line is-playing' : 'song-line'}
              style={playing ? bandStyle(song.teamId) : undefined}
              aria-pressed={playing}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(song)}
            >
              <span className="song-line-title">{song.title}</span>
              {!isCurrentTeam && (
                <span className="result-team">
                  <TeamLogo teamId={team.id} size={28} />
                  <span className="result-team-name">{team.name}</span>
                </span>
              )}
            </PressCell>
          </motion.li>
        )
      })}
    </ul>
  )
}
