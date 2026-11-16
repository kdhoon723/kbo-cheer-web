//20241476-김도훈-(2026-11-16)
import type { GridSort, PlayerInfo, Song } from '../types.ts'

export interface SortContext {
  playerOf: (song: Song) => PlayerInfo | null
  counts: Readonly<Record<string, number>>
}

const byName = (a: Song, b: Song) => a.title.localeCompare(b.title, 'ko') || a.order - b.order

function appearances(song: Song, ctx: SortContext): number | null {
  return ctx.playerOf(song)?.plateAppearances ?? null
}

/** 타석 수 많은 순. 기록이 없거나 선수 정보와 이어지지 않은 곡은 맨 아래에 가나다 순 */
function byStarters(ctx: SortContext) {
  return (a: Song, b: Song) => {
    const pa = appearances(a, ctx)
    const pb = appearances(b, ctx)
    if (pa !== null && pb !== null) return pb - pa || byName(a, b)
    if (pa !== null) return -1
    if (pb !== null) return 1
    return byName(a, b)
  }
}

export function sortPlayerSongs(songs: Song[], sort: GridSort, ctx: SortContext): Song[] {
  const starters = byStarters(ctx)
  const compare =
    sort === 'name'
      ? byName
      : sort === 'frequent'
        ? (a: Song, b: Song) => (ctx.counts[b.id] ?? 0) - (ctx.counts[a.id] ?? 0) || starters(a, b)
        : starters
  return [...songs].sort(compare)
}
