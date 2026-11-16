//20241476-김도훈-(2026-11-15)
import { playerOf } from '../data/players.ts'
import type { Song } from '../types.ts'
import { PressCell } from '../ui/Press.tsx'
import { bandStyle } from './band.ts'
import PlayerPortrait from './PlayerPortrait.tsx'

interface Props {
  songs: Song[]
  nowPlayingId: string | null
  /** 곡마다 튼 횟수를 칸에 보일 때만 넘긴다(「자주 튼」 정렬) */
  counts?: Readonly<Record<string, number>>
  onPlay: (song: Song) => void
}

export default function PlayerGrid({ songs, nowPlayingId, counts, onPlay }: Props) {
  return (
    <div className="player-grid">
      {songs.map((song) => {
        const playing = song.id === nowPlayingId
        const player = playerOf(song)
        const count = counts?.[song.id] ?? 0
        return (
          <PressCell
            key={song.id}
            type="button"
            className={playing ? 'player-cell is-playing' : 'player-cell'}
            contentClassName="player-cell-body"
            style={playing ? bandStyle(song.teamId) : undefined}
            aria-pressed={playing}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPlay(song)}
            extra={<PlayerPortrait teamId={song.teamId} player={player} size="cell" />}
          >
            <span className="player-name">{song.title}</span>
            <span className="player-sub" aria-hidden="true">
              {player?.position}
            </span>
            {count > 0 && (
              <span className="player-sub" aria-hidden="true">
                {count}번
              </span>
            )}
          </PressCell>
        )
      })}
    </div>
  )
}
