//20241476-김도훈-(2026-11-16)
import { SITUATION_CELLS } from '../lib/situationSlots.ts'
import type { Song } from '../types.ts'
import { PressCell } from '../ui/Press.tsx'
import { bandStyle } from './band.ts'

interface Props {
  cells: (Song | null)[]
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

export default function SituationGrid({ cells, nowPlayingId, onPlay }: Props) {
  return (
    <div className="situation-grid" role="group" aria-label="상황">
      {cells.map((song, i) => {
        const key = i < SITUATION_CELLS.length ? String(i + 1) : undefined
        if (!song) return <span key={`empty-${i}`} className="situation-cell is-empty" aria-hidden="true" />
        const playing = song.id === nowPlayingId
        return (
          <PressCell
            key={song.id}
            type="button"
            className={playing ? 'situation-cell situation-btn is-playing' : 'situation-cell situation-btn'}
            style={playing ? bandStyle(song.teamId) : undefined}
            aria-pressed={playing}
            aria-keyshortcuts={key}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPlay(song)}
            contentClassName="situation-label"
            extra={
              key && (
                <kbd className="situation-key" aria-hidden="true">
                  {key}
                </kbd>
              )
            }
          >
            {song.title}
          </PressCell>
        )
      })}
    </div>
  )
}
