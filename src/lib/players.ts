//20241476-김도훈-(2026-11-16)
import { TEAM_IDS, isTeamId } from '../data/teams.ts'
import type { PlayerInfo, PlayersByTeam, Song, TeamId } from '../types.ts'
import { normalize } from './hangul.ts'
import { isRecord } from './songValidation.ts'

function isCount(x: unknown): x is number | null {
  return x === null || (typeof x === 'number' && Number.isInteger(x) && x >= 0)
}

export function isPlayerInfo(x: unknown): x is PlayerInfo {
  if (!isRecord(x)) return false
  const { name, playerId, position, games, plateAppearances, photo, cutout } = x
  return (
    typeof name === 'string' &&
    name !== '' &&
    typeof playerId === 'string' &&
    playerId !== '' &&
    (position === null || typeof position === 'string') &&
    isCount(games) &&
    isCount(plateAppearances) &&
    (photo === null || photo === 'club' || photo === 'kbo') &&
    typeof cutout === 'boolean'
  )
}

/** 번들된 선수 JSON을 검사한다. 형식이 맞지 않는 선수는 건너뛴다 */
export function parsePlayers(x: unknown): PlayersByTeam {
  const out = Object.fromEntries(TEAM_IDS.map((id) => [id, [] as PlayerInfo[]])) as PlayersByTeam
  if (!isRecord(x) || !isRecord(x.teams)) return out
  for (const [teamId, list] of Object.entries(x.teams)) {
    if (!isTeamId(teamId) || !Array.isArray(list)) continue
    const items: unknown[] = list
    out[teamId] = items.filter(isPlayerInfo)
  }
  return out
}

/** 팀 안에서 이름이 겹치는 선수는 누구인지 알 수 없어 값을 null로 둔다 */
export type PlayerIndex = Record<TeamId, Map<string, PlayerInfo | null>>

export function buildPlayerIndex(byTeam: PlayersByTeam): PlayerIndex {
  const index = Object.fromEntries(TEAM_IDS.map((id) => [id, new Map<string, PlayerInfo | null>()])) as PlayerIndex
  for (const teamId of TEAM_IDS) {
    const map = index[teamId]
    for (const player of byTeam[teamId]) {
      const key = normalize(player.name)
      map.set(key, map.has(key) ? null : player)
    }
  }
  return index
}

export function findPlayer(index: PlayerIndex, song: Pick<Song, 'kind' | 'teamId' | 'title'>): PlayerInfo | null {
  if (song.kind !== 'player') return null
  return index[song.teamId].get(normalize(song.title)) ?? null
}

/** 사진 파일 주소. 사진이 있다고 표시된 선수만 요청해 없는 파일로 404가 쌓이지 않게 한다 */
export function photoUrl(teamId: TeamId, player: PlayerInfo | null): string | null {
  return player?.photo ? `/players/${teamId}/${player.playerId}.jpg` : null
}

/** 누끼(배경을 뺀 상반신) 주소. 누끼가 있다고 표시된 선수만 요청한다 */
export function cutoutUrl(teamId: TeamId, player: PlayerInfo | null): string | null {
  return player?.cutout ? `/players/${teamId}/cutout/${player.playerId}.webp` : null
}

const KIND_LABELS: Record<Exclude<Song['kind'], 'player'>, string> = { team: '팀 응원가', situation: '상황' }

/** 선수 카드 아래 둘째 줄: 선수 곡은 「구단 · 포지션」, 그 밖은 「구단 · 곡 종류」 */
export function cardSubtitle(song: Pick<Song, 'kind'>, teamName: string, player: PlayerInfo | null): string {
  const detail = song.kind === 'player' ? player?.position : KIND_LABELS[song.kind]
  return detail ? `${teamName} · ${detail}` : teamName
}

export function avatarUrl(teamId: TeamId): string {
  return `/avatars/${teamId}.webp`
}
