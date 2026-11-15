//20241476-김도훈-(2026-11-16)
import type { Song } from '../types.ts'
import { normalize } from './hangul.ts'

export type SituationCategory = 'hit' | 'out' | 'walk' | 'fullCount' | 'lineup' | 'lineupIntro' | 'opening' | 'etc'

/** 칸 순서. 단축키 1~8도 이 순서를 따른다 */
export const SITUATION_CELLS: readonly SituationCategory[] = [
  'hit', 'out', 'walk', 'fullCount',
  'lineup', 'lineupIntro', 'opening', 'etc',
]

export const GRID_COLUMNS = 4

export function situationCategory(title: string): SituationCategory {
  const t = normalize(title)
  if (t.includes('라인업')) return t.includes('소개') || t.includes('수비') ? 'lineupIntro' : 'lineup'
  if (t.includes('안타')) return 'hit'
  if (t.includes('아웃')) return 'out'
  if (t.includes('볼넷')) return 'walk'
  if (t.includes('풀카운트')) return 'fullCount'
  if (t.includes('개시')) return 'opening'
  return 'etc'
}

/**
 * 상황 곡을 4×2 칸에 놓는다. 먼저 모든 곡이 제 칸을 차지하고, 제 칸이 이미 찬 곡은
 * 남은 빈 칸 중 앞쪽부터 들어간다. 8칸이 모두 차면 나머지 곡은 9번째 칸부터 줄을 더해 놓는다
 */
export function situationSlots(songs: readonly Song[]): (Song | null)[] {
  const cells: (Song | null)[] = SITUATION_CELLS.map(() => null)
  const displaced: Song[] = []
  for (const song of [...songs].sort((a, b) => a.order - b.order)) {
    const i = SITUATION_CELLS.indexOf(situationCategory(song.title))
    if (cells[i] === null) cells[i] = song
    else displaced.push(song)
  }
  for (const song of displaced) {
    const empty = cells.indexOf(null)
    if (empty >= 0) cells[empty] = song
    else cells.push(song)
  }
  while (cells.length % GRID_COLUMNS !== 0) cells.push(null)
  return cells
}
