//20241476-김도훈-(2026-11-15)
import type {
  CandidateRow,
  CandidateWarning,
  ImportCandidate,
  Song,
  SongKind,
  TeamId,
  VideoInfo,
} from '../types.ts'
import { normalize } from './hangul.ts'
import { parseTime } from './time.ts'

const TITLE_MAX = 30

function titleErrorOf(title: string): string | null {
  const t = title.trim()
  if (t === '') return '이름을 입력해 주세요'
  if (t.length > TITLE_MAX) return `이름은 ${TITLE_MAX}자 이하로 입력해 주세요`
  return null
}

function initialWarnings(
  starts: (number | null)[],
  duration: number,
): CandidateWarning[] {
  return starts.map((s) => {
    if (s === null) return 'badTime'
    if (s >= duration) return 'outOfRange'
    return null
  })
}

function markTimeReversed(
  starts: (number | null)[],
  warnings: CandidateWarning[],
): void {
  const idx: number[] = []
  starts.forEach((_, i) => {
    if (warnings[i] === null) idx.push(i)
  })
  const value = (p: number): number => starts[idx[p]] ?? 0
  const dp: number[] = []
  const prev: number[] = []
  for (let i = 0; i < idx.length; i++) {
    dp[i] = 1
    prev[i] = -1
    for (let j = 0; j < i; j++) {
      if (value(j) < value(i) && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        prev[i] = j
      }
    }
  }
  let best = -1
  for (let i = 0; i < idx.length; i++) {
    if (best === -1 || dp[i] > dp[best]) best = i
  }
  const keep = new Set<number>()
  for (let p = best; p !== -1; p = prev[p]) keep.add(idx[p])
  for (const i of idx) {
    if (!keep.has(i)) warnings[i] = 'timeReversed'
  }
}

/** 여러 구단 영상을 볼 때 [STEP 3-㉖]. songs는 모든 팀 곡, split이면 곡마다 그 구단에 넣는다 */
export interface TeamScope {
  teamId: TeamId
  songs: Song[]
  split: boolean
}

/**
 * 후보마다 저장 여부를 판단한다. 곡을 넣을 팀(여러 구단 영상이면 그 곡의 구단)의 곡과 견준다.
 * scope가 없으면 모든 후보가 teamSongs의 팀으로 간다
 */
export function evaluateCandidates(
  candidates: ImportCandidate[],
  video: VideoInfo,
  teamSongs: Song[],
  scope: TeamScope | null = null,
): CandidateRow[] {
  const starts = candidates.map((c) => parseTime(c.startText))
  const warnings = initialWarnings(starts, video.duration)
  markTimeReversed(starts, warnings)

  const boundaries: number[] = []
  starts.forEach((s, i) => {
    if (warnings[i] === null && s !== null) boundaries.push(s)
  })

  const targetOf = (c: ImportCandidate): TeamId | null => (scope && c.teamId ? c.teamId : null)
  const songsCache = new Map<TeamId | null, Song[]>()
  const songsOf = (c: ImportCandidate): Song[] => {
    const target = targetOf(c)
    let list = songsCache.get(target)
    if (!list) {
      list = target === null || scope === null ? teamSongs : scope.songs.filter((s) => s.teamId === target)
      songsCache.set(target, list)
    }
    return list
  }
  const titlesOf = (c: ImportCandidate, kind: SongKind) =>
    new Set(songsOf(c).filter((s) => s.kind === kind).map((s) => normalize(s.title)))

  // 같은 영상 같은 시작인 곡, 또는 같은 이름의 팀 응원가(다른 모음 영상에서 이미 넣은 응원가)가 있으면 이미 있는 곡이다
  const existing = candidates.map((c, i) => {
    const s = starts[i]
    if (warnings[i] !== null) return false
    const teamSongsOfC = songsOf(c)
    if (teamSongsOfC.some((song) => song.videoId === video.videoId && song.start === s)) return true
    return c.kind === 'team' && titlesOf(c, 'team').has(normalize(c.title))
  })

  // 이미 있는 후보도 묶음에 넣는다. 팀에 같은 제목이 있으면 다시 골라 같은 제목으로 두 번 저장할 수 없다(BR-14)
  const groups = new Map<string, number[]>()
  candidates.forEach((c, i) => {
    if (c.kind !== 'situation') return
    const key = `${targetOf(c) ?? ''}|${normalize(c.title)}`
    const group = groups.get(key)
    if (group) group.push(i)
    else groups.set(key, [i])
  })
  const duplicate = candidates.map(() => false)
  for (const group of groups.values()) {
    const first = candidates[group[0]]
    if (titlesOf(first, 'situation').has(normalize(first.title))) {
      for (const i of group) duplicate[i] = true
      continue
    }
    const representative = group.find((i) => warnings[i] === null) ?? group[0]
    for (const i of group) duplicate[i] = i !== representative
  }

  return candidates.map((c, i) => {
    const start = starts[i]
    const warning = warnings[i]
    const end =
      warning !== null || start === null
        ? null
        : Math.min(...boundaries.filter((b) => b > start), video.duration)
    const titleError = titleErrorOf(c.title)
    const otherTeam = scope !== null && !scope.split && c.teamId !== null && c.teamId !== scope.teamId
    const selectable = warning === null && !duplicate[i] && titleError === null && !otherTeam
    const willSave =
      selectable &&
      (c.selection === 'on' || (c.selection === 'auto' && !existing[i]))
    return {
      ...c,
      start,
      end,
      warning,
      existing: existing[i],
      duplicate: duplicate[i],
      sameNamePlayer:
        c.kind === 'player' && !existing[i] && titlesOf(c, 'player').has(normalize(c.title)),
      otherTeam,
      titleError,
      selectable,
      willSave,
    }
  })
}
