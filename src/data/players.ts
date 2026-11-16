//20241476-김도훈-(2026-11-16)
import { buildPlayerIndex, findPlayer, parsePlayers } from '../lib/players.ts'
import type { PlayerInfo, Song } from '../types.ts'
import playersJson from './players-2026.json'

const INDEX = buildPlayerIndex(parsePlayers(playersJson))

export function playerOf(song: Pick<Song, 'kind' | 'teamId' | 'title'>): PlayerInfo | null {
  return findPlayer(INDEX, song)
}
