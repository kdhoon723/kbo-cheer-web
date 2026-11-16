//20241476-김도훈-(2026-11-15)
import type { ImportCandidate, SongKind } from '../types.ts'
import { formatTime, parseTime } from './time.ts'

const TIME_LINE = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/
const SEPARATOR = /^-{3,}$/
const PLAYER_SUFFIX = /\s*등장곡(\+응원가)?$/

interface Chapter {
  lineNo: number
  start: number
  rawTitle: string
  rawLine: string
}

export function parseDescription(description: string): ImportCandidate[] {
  const chapters: Chapter[] = []
  const separators: number[] = []

  description.split(/\r?\n/).forEach((original, lineNo) => {
    const line = original.trim()
    if (SEPARATOR.test(line)) {
      separators.push(lineNo)
      return
    }
    const m = TIME_LINE.exec(line)
    const start = m ? parseTime(m[1]) : null
    if (!m || start === null) return
    chapters.push({ lineNo, start, rawTitle: m[2].trim(), rawLine: line })
  })

  const teamSectionLine = Math.max(
    -1,
    ...separators.filter((sep) => chapters.some((c) => c.lineNo > sep)),
  )

  return chapters.map((c, key) => {
    const inTeamSection = c.lineNo > teamSectionLine && teamSectionLine >= 0
    let kind: SongKind
    let title = c.rawTitle
    if (inTeamSection) {
      kind = 'team'
    } else if (PLAYER_SUFFIX.test(c.rawTitle)) {
      kind = 'player'
      title = c.rawTitle.replace(PLAYER_SUFFIX, '').trim()
    } else {
      kind = 'situation'
    }
    return {
      key,
      lineNo: c.lineNo,
      rawLine: c.rawLine,
      inTeamSection,
      teamId: null,
      kind,
      title,
      startText: formatTime(c.start),
      selection: 'auto',
    }
  })
}
