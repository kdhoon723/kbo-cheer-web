//20241476-김도훈-(2026-11-16)
import { useEffect, useId, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import * as m from 'motion/react-m'
import { playerOf } from '../data/players.ts'
import { getTeam } from '../data/teams.ts'
import { LYRICS_LICENSE, sourceLabel } from '../lib/lyrics.ts'
import type { Lyric } from '../lib/lyrics.ts'
import { cardSubtitle } from '../lib/players.ts'
import type { Song } from '../types.ts'
import { distance, swap } from '../ui/motionTokens.ts'
import PlayerPortrait from './PlayerPortrait.tsx'
import TeamLogo from './TeamLogo.tsx'

interface ToggleFocus {
  /** 넓은 화면에서 접기·펼치기로 버튼 자리가 바뀌었으면 새 버튼으로 포커스를 옮긴다 */
  focusToggle?: boolean
  onFocused?: () => void
}

function useToggleFocus({ focusToggle, onFocused }: ToggleFocus) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!focusToggle) return
    ref.current?.focus()
    onFocused?.()
  }, [focusToggle, onFocused])
  return ref
}

function LyricsBody({ id, lyric }: { id: string; lyric: Lyric }) {
  return (
    <m.div id={id} className="lyrics-body" initial={{ opacity: 0, y: -distance.row }} animate={{ opacity: 1, y: 0 }} transition={swap}>
      <p className="lyrics-text">{lyric.lyrics}</p>
      <p className="lyrics-source">
        출처:{' '}
        <a href={lyric.source} target="_blank" rel="noopener noreferrer">
          {sourceLabel(lyric)}
        </a>
        {/* 나무위키 글만 CC BY-NC-SA다. 구단 공식 사이트 가사에는 라이선스 문구를 붙이지 않는다 */}
        {lyric.sourceKind === 'namuwiki' && (
          <>
            {' '}
            ·{' '}
            <a href={LYRICS_LICENSE.url} target="_blank" rel="noopener noreferrer license">
              {LYRICS_LICENSE.name}
            </a>
          </>
        )}
      </p>
    </m.div>
  )
}

interface Props extends ToggleFocus {
  lyric: Lyric
  open: boolean
  onToggle: () => void
}

/**
 * 지금 곡의 가사. 처음에는 펼쳐 두고, 접거나 펼친 것은 설정에 남아 다음 곡에도 이어진다 [STEP 3-㉗].
 * 가사 아래에 출처를 쓴다(나무위키는 라이선스도) [STEP 3-㉘]. 넓은 화면에서 펼친 가사는 CardLyrics다 [STEP 3-㉙]
 */
export default function LyricsBlock({ lyric, open, onToggle, ...focus }: Props) {
  const bodyId = useId()
  const toggleRef = useToggleFocus(focus)
  return (
    <section className="lyrics" aria-label="가사">
      <button ref={toggleRef} type="button" className="lyrics-toggle" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        {open ? '가사 접기' : '가사 보기'}
        <ChevronDown className="lyrics-chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && <LyricsBody id={bodyId} lyric={lyric} />}
    </section>
  )
}

interface CardProps extends ToggleFocus {
  song: Song
  lyric: Lyric
  onClose: () => void
}

/**
 * 넓은 화면에서 펼친 가사 [STEP 3-㉙]. 선수 카드와 같은 높이 자리에서 카드를 작은 머리줄(사진·이름·팀)로 줄이고
 * 남는 자리에 가사를 둔다. 자리 높이가 같아 아래의 「응원가로」·정지·상황 칸이 움직이지 않고, 가사는 이 자리 안에서 스크롤한다
 */
export function CardLyrics({ song, lyric, onClose, ...focus }: CardProps) {
  const bodyId = useId()
  const toggleRef = useToggleFocus(focus)
  const player = song.kind === 'player' ? playerOf(song) : null
  return (
    <section className="lyrics card-lyrics" aria-label="가사">
      <div className="card-lyrics-head">
        {song.kind === 'player' ? (
          <PlayerPortrait teamId={song.teamId} player={player} size="dock" />
        ) : (
          <TeamLogo teamId={song.teamId} size={36} />
        )}
        <div className="card-lyrics-names">
          <p className="card-lyrics-name">{song.title}</p>
          <p className="card-sub">{cardSubtitle(song, getTeam(song.teamId).name, player)}</p>
        </div>
        <button ref={toggleRef} type="button" className="lyrics-toggle" aria-expanded="true" aria-controls={bodyId} onClick={onClose}>
          가사 접기
          <ChevronDown className="lyrics-chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <LyricsBody id={bodyId} lyric={lyric} />
    </section>
  )
}

/**
 * 넓은 화면에서 가사를 접었을 때 선수 카드 자리 오른쪽 위에 두는 「가사」 버튼 [STEP 3-㉛].
 * 여는 곳과 열리는 곳이 같은 자리여야 해서 맨 아래 한 줄 대신 여기에 둔다. 팀 색 판(카드 아래 30%)보다 위라 판 위에 글자가 없다
 */
export function CardLyricsButton({ onOpen, ...focus }: ToggleFocus & { onOpen: () => void }) {
  const toggleRef = useToggleFocus(focus)
  return (
    <button ref={toggleRef} type="button" className="card-lyrics-open" aria-expanded="false" onClick={onOpen}>
      가사
      <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
