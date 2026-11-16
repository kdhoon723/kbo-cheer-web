//20241476-김도훈-(2026-11-16)
import { Play, Square } from 'lucide-react'
import * as m from 'motion/react-m'
import { Link } from 'react-router-dom'
import { playerOf } from '../data/players.ts'
import { songMeta } from '../lib/songList.ts'
import type { Song } from '../types.ts'
import { listItemMotion } from '../ui/motionTokens.ts'
import PlayerPortrait from './PlayerPortrait.tsx'
import TeamLogo from './TeamLogo.tsx'

interface Props {
  song: Song
  /** 화면에서 몇 번째 줄인지. 처음 열 때 차례로 올라온다 */
  index: number
  editTo: string
  /** 넓은 화면에서 오른쪽 수정 칸에 열린 곡 */
  selected: boolean
  playing: boolean
  onPreview: (song: Song) => void
}

/** 곡 관리 한 줄. 줄을 누르면 수정 화면, 오른쪽 버튼은 미리 듣기(재생 중이면 정지) */
export default function SongListItem({ song, index, editTo, selected, playing, onPreview }: Props) {
  const player = song.kind === 'player' ? playerOf(song) : null
  return (
    <m.li className="song-item" data-song-id={song.id} {...listItemMotion(index)}>
      <Link className="song-item-main" to={editTo} aria-current={selected ? 'true' : undefined}>
        {song.kind === 'player' ? (
          <PlayerPortrait teamId={song.teamId} player={player} size="dock" />
        ) : (
          <TeamLogo teamId={song.teamId} size={28} />
        )}
        <span className="song-item-text">
          <span className="song-item-name">
            <span className="song-item-title">{song.title}</span>
            {player?.position && <span className="song-item-pos">{player.position}</span>}
          </span>
          <span className="song-item-meta">{songMeta(song)}</span>
        </span>
      </Link>
      <button
        type="button"
        className="icon-btn song-item-play"
        aria-label={playing ? `정지: ${song.title}` : `미리 듣기: ${song.title}`}
        onClick={() => onPreview(song)}
      >
        {playing ? (
          <Square size={16} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
        ) : (
          <Play size={18} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </m.li>
  )
}
