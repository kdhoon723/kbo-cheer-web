//20241476-김도훈-(2026-11-15)
import { motion } from 'motion/react'
import { formatTime } from '../lib/time.ts'
import type { Song, SongKind } from '../types.ts'
import { listItemMotion } from '../ui/motionTokens.ts'

interface Props {
  song: Song
  /** 화면 전체에서 몇 번째 줄인지. 처음 열 때 차례로 올라온다 */
  index: number
  onEdit: (id: string) => void
  onDelete: (song: Song) => void
}

const KIND_LABELS: Record<SongKind, string> = {
  player: '선수',
  situation: '상황',
  team: '팀 응원가',
}

export default function SongRow({ song, index, onEdit, onDelete }: Props) {
  return (
    <motion.li className="song-row" {...listItemMotion(index)}>
      <div className="song-row-info">
        <span className="song-row-kind">{KIND_LABELS[song.kind]}</span>
        <strong className="song-row-title">{song.title}</strong>
        <span className="song-row-range">
          {formatTime(song.start)} ~ {formatTime(song.end)}
        </span>
        {song.cheerStart !== null && (
          <span className="song-row-cheer">응원가 시작 {formatTime(song.cheerStart)}</span>
        )}
      </div>
      <div className="song-row-actions">
        <button type="button" onClick={() => onEdit(song.id)}>
          수정
        </button>
        <button type="button" onClick={() => onDelete(song)}>
          삭제
        </button>
      </div>
    </motion.li>
  )
}
