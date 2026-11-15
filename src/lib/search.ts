//20241476-김도훈-(2026-11-15)
import { getTeam } from '../data/teams.ts'
import type { Song, Team, TeamId } from '../types.ts'
import { isChosungOnly, normalize, toChosung } from './hangul.ts'

export interface SearchHit {
  song: Song
  team: Team
  isCurrentTeam: boolean
}

export interface SearchEntry {
  song: Song
  norm: string
  cho: string
}

export function buildSearchIndex(songs: Song[]): SearchEntry[] {
  return songs.map((song) => {
    const norm = normalize(song.title)
    return { song, norm, cho: toChosung(norm) }
  })
}

export function searchIndex(index: SearchEntry[], query: string, currentTeamId: TeamId): SearchHit[] {
  const q = normalize(query)
  if (q === '') return []
  const chosung = isChosungOnly(q)
  const found: { entry: SearchEntry; pos: number }[] = []
  for (const entry of index) {
    const pos = (chosung ? entry.cho : entry.norm).indexOf(q)
    if (pos >= 0) found.push({ entry, pos })
  }
  const rank = (f: { entry: SearchEntry; pos: number }) => [
    f.entry.song.teamId === currentTeamId ? 0 : 1,
    f.pos === 0 ? 0 : 1,
    f.entry.song.order,
  ]
  found.sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
    return 0
  })
  return found.map(({ entry }) => ({
    song: entry.song,
    team: getTeam(entry.song.teamId),
    isCurrentTeam: entry.song.teamId === currentTeamId,
  }))
}

export function searchSongs(songs: Song[], query: string, currentTeamId: TeamId): SearchHit[] {
  return searchIndex(buildSearchIndex(songs), query, currentTeamId)
}
