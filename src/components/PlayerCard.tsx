//20241476-김도훈-(2026-11-16)
import { useState } from 'react'
import * as m from 'motion/react-m'
import { playerOf } from '../data/players.ts'
import { getTeam } from '../data/teams.ts'
import { PLAYER_PHOTOS } from '../lib/media.ts'
import { cardSubtitle, cutoutUrl } from '../lib/players.ts'
import type { Song } from '../types.ts'
import { swap } from '../ui/motionTokens.ts'
import { bandStyle } from './band.ts'
import PlayerPortrait from './PlayerPortrait.tsx'
import TeamLogo from './TeamLogo.tsx'

interface Props {
  song: Song | null
}

/**
 * 지금 곡의 선수를 크게 보이는 카드. 아래쪽 판만 팀 색으로 칠하고 누끼가 판 위에 서서 머리와 어깨가 판 위로 올라온다.
 * 판 위에는 글자를 두지 않아 팀 색과 글자의 대비를 따질 일이 없다. 이름은 카드 아래 어두운 바탕에 쓴다
 */
export default function PlayerCard({ song }: Props) {
  const key = song?.id ?? null
  // 처음 그릴 때는 나타나지 않고, 곡이 바뀔 때만 페이드한다
  const [firstKey] = useState(key)
  const fade = key === firstKey ? false : { opacity: 0 }
  return (
    <m.div
      key={key ?? 'idle'}
      className="player-card"
      initial={fade}
      animate={{ opacity: 1 }}
      transition={swap}
    >
      <div
        className={song ? 'card-stage' : 'card-stage is-idle'}
        style={song ? bandStyle(song.teamId) : undefined}
        aria-hidden="true"
      >
        <div className="card-plate" />
        {song && <CardFigure song={song} />}
      </div>
      <p className="card-name">{song ? song.title : '선택한 곡 없음'}</p>
      {/* 곡이 없을 때도 줄을 남겨 첫 곡에 아래 상황 칸이 밀리지 않게 한다 */}
      <p className="card-sub">{song ? cardSubtitle(song, getTeam(song.teamId).name, playerOf(song)) : ''}</p>
    </m.div>
  )
}

function CardFigure({ song }: { song: Song }) {
  const player = playerOf(song)
  const cutout = PLAYER_PHOTOS ? cutoutUrl(song.teamId, player) : null
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  if (song.kind !== 'player') {
    return (
      <span className="card-logo">
        <TeamLogo teamId={song.teamId} size={88} />
      </span>
    )
  }
  return (
    <>
      <span className="card-team">
        <TeamLogo teamId={song.teamId} size={28} />
      </span>
      {cutout && !failed ? (
        <img
          className={loaded ? 'card-cutout is-loaded' : 'card-cutout'}
          src={cutout}
          alt=""
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <PlayerPortrait teamId={song.teamId} player={player} size="card" />
      )}
    </>
  )
}
