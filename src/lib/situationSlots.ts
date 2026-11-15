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

const SITUATION_NAMES: Record<Exclude<SituationCategory, 'etc'>, string> = {
  hit: '안타',
  out: '아웃',
  walk: '볼넷',
  fullCount: '풀카운트',
  lineup: '라인업',
  lineupIntro: '라인업 소개',
  opening: '경기 개시',
}

export interface SituationLabel {
  name: string
  /** 상황 이름만으로 알 수 없는 곡 제목. 이름과 사실상 같으면 null */
  detail: string | null
}

// "공통 안타 송", "경기 개시 음악"처럼 상황 이름에 붙는 말을 떼면 이름과 같아지는 제목은 다시 쓰지 않는다
function core(title: string): string {
  return normalize(title).replace(/^공통/, '').replace(/(송|곡|음악|응원가)$/, '')
}

export function situationLabel(title: string): SituationLabel {
  const category = situationCategory(title)
  if (category === 'etc') return { name: title, detail: null }
  const name = SITUATION_NAMES[category]
  return { name, detail: core(title) === normalize(name) ? null : title }
}

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
 * 상황 곡을 4×2 칸에 놓는다. 곡은 order 순서로 제 상황 칸을 차지하고, 제 칸이 이미 찬 곡은
 * 9번째 칸부터 줄을 더해 놓는다. 다른 상황의 빈 칸에는 넣지 않아 앞 8칸과 단축키 1~8의 뜻이 늘 같다
 */
export function situationSlots(songs: readonly Song[]): (Song | null)[] {
  const cells: (Song | null)[] = SITUATION_CELLS.map(() => null)
  for (const song of [...songs].sort((a, b) => a.order - b.order)) {
    const i = SITUATION_CELLS.indexOf(situationCategory(song.title))
    if (cells[i] === null) cells[i] = song
    else cells.push(song)
  }
  while (cells.length % GRID_COLUMNS !== 0) cells.push(null)
  return cells
}
