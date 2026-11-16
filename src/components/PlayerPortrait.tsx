//20241476-김도훈-(2026-11-16)
import { useState } from 'react'
import { avatarUrl, photoUrl } from '../lib/players.ts'
import { PLAYER_PHOTOS } from '../lib/media.ts'
import type { PlayerInfo, TeamId } from '../types.ts'

interface Props {
  teamId: TeamId
  player: PlayerInfo | null
  size: 'cell' | 'row' | 'dock' | 'card'
}

/**
 * 구단 기본 아바타를 먼저 깔고 사진은 불러온 뒤에만 보여 준다.
 * 사진이 없거나 못 받아도 깨진 그림 표시 없이 아바타가 그대로 남는다
 */
export default function PlayerPortrait({ teamId, player, size }: Props) {
  const url = PLAYER_PHOTOS ? photoUrl(teamId, player, size === 'card' ? 'card' : 'thumb') : null
  const [loaded, setLoaded] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <span className={`portrait portrait-${size}`} aria-hidden="true">
      <img src={avatarUrl(teamId)} alt="" width={40} height={40} />
      {url !== null && failed !== url && (
        <img
          className={loaded === url ? 'portrait-photo is-loaded' : 'portrait-photo'}
          src={url}
          alt=""
          decoding="async"
          onLoad={() => setLoaded(url)}
          onError={() => setFailed(url)}
        />
      )}
    </span>
  )
}
