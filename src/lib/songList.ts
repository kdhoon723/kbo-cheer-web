//20241476-김도훈-(2026-11-16)
import type { Song, SongKind } from '../types.ts'
import { buildSearchIndex, searchIndex } from './search.ts'
import { formatTime } from './time.ts'

export const SONG_TABS: readonly { kind: SongKind; label: string }[] = [
  { kind: 'player', label: '선수' },
  { kind: 'situation', label: '상황' },
  { kind: 'team', label: '팀 응원가' },
]

/** 주소의 ?tab= 값. 모르는 값이면 선수 */
export function parseTab(x: string | null): SongKind {
  return x === 'situation' || x === 'team' ? x : 'player'
}

/** 곡 관리 목록에서 고른 것: 탭, 검색어, 「응원가 시작 없는 곡」 */
export interface SongListView {
  tab: SongKind
  q: string
  missing: boolean
}

/** 주소(?tab=&q=&missing=1)에서 읽는다. 필터는 선수 탭에서만 켜진다 */
export function listViewOf(params: URLSearchParams): SongListView {
  const tab = parseTab(params.get('tab'))
  return { tab, q: params.get('q') ?? '', missing: tab === 'player' && params.get('missing') === '1' }
}

/** 주소에 적을 문자열. 기본값(선수 탭, 빈 검색어, 필터 끔)은 적지 않는다 */
export function listSearchOf(view: SongListView): string {
  const params = new URLSearchParams()
  if (view.tab !== 'player') params.set('tab', view.tab)
  if (view.q !== '') params.set('q', view.q)
  if (view.tab === 'player' && view.missing) params.set('missing', '1')
  return params.toString()
}

/**
 * 곡 관리 목록 주소. 지금 검색어·필터(search)는 두고 탭만 그 종류로 바꾼다(선수는 기본 탭이라 생략).
 * 수정 화면에서 돌아갈 때 그 곡이 있는(저장으로 종류를 바꿨으면 바뀐) 탭이 보인다
 */
export function songListPath(teamId: string, search: string, kind: SongKind): string {
  const params = new URLSearchParams(search)
  if (kind === 'player') params.delete('tab')
  else params.set('tab', kind)
  const q = params.toString()
  return `/team/${teamId}/songs${q ? `?${q}` : ''}`
}

/** 응원가 시작을 아직 정하지 않은 선수 곡인가 */
export function isMissingCheer(song: Song): boolean {
  return song.kind === 'player' && song.cheerStart === null
}

export interface SongListQuery {
  kind: SongKind
  /** 이름·제목·초성. 빈 문자열이면 거르지 않는다 */
  query: string
  /** 선수 탭에서만 쓴다 */
  missingCheerOnly: boolean
}

/** 한 팀 곡 중 한 종류를 등록 순서로. 검색어가 있으면 응원 화면 검색과 같은 규칙(이름·초성, 앞에서 맞는 것 먼저)으로 거른다 */
export function listSongs(teamSongs: Song[], q: SongListQuery): Song[] {
  let list = teamSongs.filter((s) => s.kind === q.kind)
  if (q.kind === 'player' && q.missingCheerOnly) list = list.filter(isMissingCheer)
  if (q.query.trim() === '') return [...list].sort((a, b) => a.order - b.order)
  const teamId = list[0]?.teamId
  if (!teamId) return []
  return searchIndex(buildSearchIndex(list), q.query, teamId).map((h) => h.song)
}

/** 「1:01」처럼 길이를 분:초로 쓴다(앞 0 없음) */
export function formatLength(sec: number): string {
  const m = Math.floor(sec / 60)
  return `${m}:${String(sec % 60).padStart(2, '0')}`
}

/** 목록 둘째 줄: 「06:54–07:55 · 1:01 · 응원가 07:25」. 선수 곡이 아니면 응원가 부분이 없다 */
export function songMeta(song: Song): string {
  const range = `${formatTime(song.start)}–${formatTime(song.end)} · ${formatLength(song.end - song.start)}`
  if (song.kind !== 'player') return range
  return `${range} · ${song.cheerStart === null ? '응원가 시작 없음' : `응원가 ${formatTime(song.cheerStart)}`}`
}
