//20241476-김도훈-(2026-11-15)
import type {
  CandidateRow,
  CandidateWarning,
  ImportCandidate,
  Song,
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

export function evaluateCandidates(
  candidates: ImportCandidate[],
  video: VideoInfo,
  teamSongs: Song[],
): CandidateRow[] {
  const starts = candidates.map((c) => parseTime(c.startText))
  const warnings = initialWarnings(starts, video.duration)
  markTimeReversed(starts, warnings)

  const boundaries: number[] = []
  starts.forEach((s, i) => {
    if (warnings[i] === null && s !== null) boundaries.push(s)
  })

  const existing = candidates.map((_, i) => {
    const s = starts[i]
    return (
      warnings[i] === null &&
      teamSongs.some((song) => song.videoId === video.videoId && song.start === s)
    )
  })

  const teamSituationTitles = new Set(
    teamSongs.filter((s) => s.kind === 'situation').map((s) => normalize(s.title)),
  )
  const teamPlayerTitles = new Set(
    teamSongs.filter((s) => s.kind === 'player').map((s) => normalize(s.title)),
  )

  // 이미 있는 후보도 묶음에 넣는다. 팀에 같은 제목이 있으면 다시 골라 같은 제목으로 두 번 저장할 수 없다(BR-14)
  const groups = new Map<string, number[]>()
  candidates.forEach((c, i) => {
    if (c.kind !== 'situation') return
    const key = normalize(c.title)
    const group = groups.get(key)
    if (group) group.push(i)
    else groups.set(key, [i])
  })
  const duplicate = candidates.map(() => false)
  for (const [key, group] of groups) {
    if (teamSituationTitles.has(key)) {
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
    const selectable = warning === null && !duplicate[i] && titleError === null
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
        c.kind === 'player' && !existing[i] && teamPlayerTitles.has(normalize(c.title)),
      titleError,
      selectable,
      willSave,
    }
  })
}
