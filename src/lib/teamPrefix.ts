//20241476-김도훈-(2026-11-16)
import { TEAM_IDS } from '../data/teams.ts'
import type { ImportCandidate, Song, SongKind, TeamId } from '../types.ts'
import { normalize } from './hangul.ts'
import { songsPerTeam } from './importReview.ts'
import type { TeamCount } from './importReview.ts'

/** 챕터 이름 앞에 오는 구단 표기. 정식 이름, 줄인 이름, 별칭, 예전 이름 */
const TEAM_ALIASES: Record<TeamId, readonly string[]> = {
  kiwoom: ['키움 히어로즈', '키움', '히어로즈', '넥센 히어로즈', '넥센'],
  hanwha: ['한화 이글스', '한화', '이글스'],
  lotte: ['롯데 자이언츠', '롯데', '자이언츠'],
  ssg: ['SSG 랜더스', 'SSG', '랜더스', 'SK 와이번스', 'SK', '와이번스'],
  doosan: ['두산 베어스', '두산', '베어스'],
  nc: ['NC 다이노스', 'NC', '다이노스'],
  kia: ['KIA 타이거즈', 'KIA', '기아 타이거즈', '기아', '타이거즈', '해태 타이거즈', '해태'],
  lg: ['LG 트윈스', 'LG', '트윈스'],
  samsung: ['삼성 라이온즈', '삼성', '라이온즈'],
  kt: ['KT 위즈', 'KT', 'kt wiz', 'KT WIZ', '위즈'],
}

// 띄어쓰기와 대소문자는 가리지 않는다(「KT위즈」「kt wiz」「Kt Wiz」)
const aliasKey = (s: string) => s.replace(/\s+/g, '').toLowerCase()

const TEAM_BY_ALIAS = new Map<string, TeamId>(
  TEAM_IDS.flatMap((id) => TEAM_ALIASES[id].map((alias): [string, TeamId] => [aliasKey(alias), id])),
)

// 「<구단> - <곡>」. 앞쪽이 구단 표기와 똑같을 때만 접두어로 본다
const PREFIX = /^(.+?)\s*[-–—]\s*(.+)$/

export function teamPrefixOf(title: string): { teamId: TeamId; rest: string } | null {
  const m = PREFIX.exec(title.trim())
  if (!m) return null
  const teamId = TEAM_BY_ALIAS.get(aliasKey(m[1]))
  return teamId ? { teamId, rest: m[2].trim() } : null
}

/**
 * 여러 구단 곡이 섞인 영상인지 본다. 「<구단> - 」로 시작하는 챕터가 둘 이상이고 구단이 둘 이상이면
 * 접두어를 떼고 곡마다 구단을 적는다. 아니면 null(한 팀 영상은 지금처럼 다룬다)
 *
 * 이런 영상은 구분선(BR-13)이 없어 모든 곡이 상황이 된다. 등장곡 접미어로 선수가 된 곡은 그대로 두고,
 * 상황이 된 곡은 그 구단의 상황 곡·선수 곡 이름과 같을 때만 그 종류로, 나머지는 팀 응원가로 본다
 */
export function splitTeamPrefixes(
  candidates: ImportCandidate[],
  songs: Song[],
): { candidates: ImportCandidate[]; teams: TeamCount[] } | null {
  const hits = candidates.map((c) => teamPrefixOf(c.title))
  const found = hits.filter((h) => h !== null)
  if (found.length < 2 || new Set(found.map((h) => h.teamId)).size < 2) return null

  const namesOf = (teamId: TeamId, kind: SongKind) =>
    new Set(songs.filter((s) => s.teamId === teamId && s.kind === kind).map((s) => normalize(s.title)))
  const names = new Map(
    TEAM_IDS.map((id) => [id, { situation: namesOf(id, 'situation'), player: namesOf(id, 'player') }] as const),
  )

  const next = candidates.map((c, i): ImportCandidate => {
    const hit = hits[i]
    if (!hit) return c
    let kind = c.kind
    if (kind === 'situation') {
      const n = names.get(hit.teamId)
      const key = normalize(hit.rest)
      kind = n?.situation.has(key) ? 'situation' : n?.player.has(key) ? 'player' : 'team'
    }
    return { ...c, teamId: hit.teamId, title: hit.rest, kind }
  })
  return { candidates: next, teams: songsPerTeam(found) }
}
