//20241476-김도훈-(2026-11-15)
import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'
import type { Locator, Page, TestInfo } from '@playwright/test'
import type { Song, SongKind, TeamId } from '../src/types.ts'

declare global {
  interface Window {
    YT?: typeof YT
  }
  namespace YT {
    function get(id: string): Player | undefined
  }
}

export const APP_ORIGIN = 'http://localhost:5173'
export const SONGS_KEY = 'kboCheer.songs'
export const HISTORY_KEY = 'kboCheer.history'

const TEAM_IDS: readonly string[] = ['kiwoom', 'hanwha', 'lotte', 'ssg', 'doosan', 'nc', 'kia', 'lg', 'samsung', 'kt']
const KINDS: readonly string[] = ['player', 'team', 'situation']

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isTeam(x: unknown): x is TeamId {
  return typeof x === 'string' && TEAM_IDS.includes(x)
}

function isKind(x: unknown): x is SongKind {
  return typeof x === 'string' && KINDS.includes(x)
}

function toSong(x: unknown): Song {
  if (!isRecord(x)) throw new Error('곡 항목이 객체가 아님')
  const { id, teamId, kind, title, videoId, videoDuration, start, end, cheerStart, order } = x
  if (
    typeof id !== 'string' ||
    !isTeam(teamId) ||
    !isKind(kind) ||
    typeof title !== 'string' ||
    typeof videoId !== 'string' ||
    typeof videoDuration !== 'number' ||
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    (cheerStart !== null && typeof cheerStart !== 'number') ||
    typeof order !== 'number'
  ) {
    throw new Error(`곡 형식이 다름: ${JSON.stringify(x)}`)
  }
  return { id, teamId, kind, title, videoId, videoDuration, start, end, cheerStart, order }
}

export function parseSongList(x: unknown): Song[] {
  if (!isRecord(x) || !Array.isArray(x.songs)) throw new Error('songs 배열이 없음')
  const items: unknown[] = x.songs
  return items.map(toSong)
}

const SEED: readonly Song[] = parseSongList(
  JSON.parse(readFileSync(new URL('../src/data/seed-songs.json', import.meta.url), 'utf8')),
)

export function seedSongs(): Song[] {
  return SEED.map((s) => ({ ...s }))
}

export function seedSong(teamId: TeamId, title: string): Song {
  const song = SEED.find((s) => s.teamId === teamId && s.title === title)
  if (!song) throw new Error(`처음 데이터에 없는 곡: ${teamId} ${title}`)
  return { ...song }
}

export function teamSongs(teamId: TeamId, kind: SongKind): Song[] {
  return SEED.filter((s) => s.teamId === teamId && s.kind === kind).sort((a, b) => a.order - b.order)
}

/** 첫 문서 로드에서만 LocalStorage를 채운다. 새로고침 뒤에는 앱이 저장한 값을 그대로 둔다 */
export async function presetStorage(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(
    ({ origin, key, value }) => {
      if (location.origin !== origin) return
      const flag = 'e2e.preset.' + key
      if (sessionStorage.getItem(flag) !== null) return
      sessionStorage.setItem(flag, '1')
      localStorage.setItem(key, value)
    },
    { origin: APP_ORIGIN, key, value },
  )
}

export async function presetSongs(page: Page, songs: Song[]): Promise<void> {
  await presetStorage(page, SONGS_KEY, JSON.stringify({ version: 1, songs }))
}

export async function storedSongs(page: Page): Promise<Song[]> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SONGS_KEY)
  if (raw === null) throw new Error('저장된 곡 목록이 없음')
  return parseSongList(JSON.parse(raw))
}

export interface YtSnapshot {
  state: number
  time: number
  volume: number
  videoId: string
}

export const PLAYING = 1
export const PAUSED = 2
export const ENDED = 0

export async function ytSnapshot(page: Page): Promise<YtSnapshot | null> {
  return page.evaluate(() => {
    const p = window.YT?.get?.('yt-player')
    // 플레이어 iframe이 준비되기 전에는 메서드가 아직 붙어 있지 않다
    if (!p || typeof p.getPlayerState !== 'function' || typeof p.getVideoData !== 'function') return null
    return {
      state: p.getPlayerState(),
      time: p.getCurrentTime(),
      volume: p.getVolume(),
      videoId: p.getVideoData()?.video_id ?? '',
    }
  })
}

export interface Segment {
  start: number
  end: number
  videoId?: string
}

function isPlayingIn(s: YtSnapshot | null, seg: Segment): s is YtSnapshot {
  return (
    s !== null &&
    s.state === PLAYING &&
    s.time >= seg.start &&
    s.time < seg.end &&
    (seg.videoId === undefined || s.videoId === seg.videoId)
  )
}

export async function waitPlayingIn(
  page: Page,
  seg: Segment,
  timeout = 20_000,
): Promise<YtSnapshot & { waitedMs: number }> {
  const began = Date.now()
  let last: YtSnapshot | null = null
  while (Date.now() - began < timeout) {
    last = await ytSnapshot(page)
    if (isPlayingIn(last, seg)) return { ...last, waitedMs: Date.now() - began }
    await page.waitForTimeout(100)
  }
  throw new Error(`구간 ${JSON.stringify(seg)} 안에서 재생되지 않음. 마지막 상태: ${JSON.stringify(last)}`)
}

export async function waitNotPlaying(page: Page, timeout = 5_000): Promise<YtSnapshot> {
  const began = Date.now()
  let last: YtSnapshot | null = null
  while (Date.now() - began < timeout) {
    last = await ytSnapshot(page)
    if (last !== null && last.state !== PLAYING && last.state !== 3) return last
    await page.waitForTimeout(100)
  }
  throw new Error(`재생이 멈추지 않음. 마지막 상태: ${JSON.stringify(last)}`)
}

// 요청 URL에 API 키가 들어 있어 URL은 남기지 않고 수만 센다
export function countDataApiCalls(page: Page): () => number {
  let n = 0
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/youtube/v3/')) n++
  })
  return () => n
}

export function note(testInfo: TestInfo, type: string, value: unknown): void {
  const description = typeof value === 'string' ? value : JSON.stringify(value)
  testInfo.annotations.push({ type, description })
  console.log(`[${testInfo.title}] ${type}: ${description}`)
}

export function exactText(text: string): RegExp {
  return new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')
}

export function playerButton(page: Page, title: string): Locator {
  return page.locator('.player-grid').getByRole('button', { name: title, exact: true })
}

export function playerNames(page: Page): Locator {
  return page.locator('.player-grid .player-name')
}

interface PlayerRecord {
  name: string
  playerId: string
  plateAppearances: number | null
}

function playersOf(teamId: TeamId): PlayerRecord[] {
  const raw: unknown = JSON.parse(readFileSync(new URL('../src/data/players-2026.json', import.meta.url), 'utf8'))
  if (!isRecord(raw) || !isRecord(raw.teams)) throw new Error('선수 데이터 형식이 다름')
  const list: unknown = raw.teams[teamId]
  if (!Array.isArray(list)) throw new Error(`선수 목록이 없는 팀: ${teamId}`)
  return list.map((x: unknown) => {
    if (!isRecord(x) || typeof x.name !== 'string' || typeof x.playerId !== 'string') throw new Error('선수 항목 형식이 다름')
    const pa = x.plateAppearances
    return { name: x.name, playerId: x.playerId, plateAppearances: typeof pa === 'number' ? pa : null }
  })
}

export function playerId(teamId: TeamId, name: string): string {
  const found = playersOf(teamId).find((p) => p.name === name)
  if (!found) throw new Error(`선수 데이터에 없는 선수: ${teamId} ${name}`)
  return found.playerId
}

/** 처음 데이터의 선수 곡을 주전순(타석 수 많은 순, 같으면 가나다, 기록 없는 선수는 맨 아래 가나다)으로 늘어놓은 이름 */
export function starterOrder(teamId: TeamId): string[] {
  const pa = new Map(playersOf(teamId).map((p) => [p.name, p.plateAppearances]))
  const names = teamSongs(teamId, 'player').map((s) => s.title)
  const has = names.filter((n) => pa.get(n) != null)
  const none = names.filter((n) => pa.get(n) == null)
  has.sort((a, b) => (pa.get(b) ?? 0) - (pa.get(a) ?? 0) || a.localeCompare(b, 'ko'))
  none.sort((a, b) => a.localeCompare(b, 'ko'))
  return [...has, ...none]
}

export function situationButton(page: Page, title: string): Locator {
  return page.locator('.dock-situations').getByRole('button', { name: title, exact: true })
}

export function toast(page: Page): Locator {
  return page.locator('button.toast')
}

export function nowTitle(page: Page): Locator {
  return page.locator('.player-panel .now-title')
}

/** 재생 줄 맨 위 상태 글자(대기 중, 재생 준비 중, 지금 재생, 멈추는 중, 멈춤) */
export function nowLabel(page: Page): Locator {
  return page.locator('.player-panel .now-label')
}

export function nowTeam(page: Page): Locator {
  return page.locator('.player-panel .now-team')
}

export function teamTrigger(page: Page): Locator {
  return page.getByRole('button', { name: /^팀 선택: / })
}

const TEAM_NAMES: Record<TeamId, string> = {
  kiwoom: '키움', hanwha: '한화', lotte: '롯데', ssg: 'SSG', doosan: '두산',
  nc: 'NC', kia: 'KIA', lg: 'LG', samsung: '삼성', kt: 'KT',
}

export function teamName(teamId: TeamId): string {
  return TEAM_NAMES[teamId]
}

/** 머리말의 팀 버튼으로 팀 고르기 창을 열어 팀을 고른다 */
export async function pickTeam(page: Page, teamId: TeamId): Promise<void> {
  await teamTrigger(page).click()
  const sheet = page.getByRole('dialog', { name: '팀 고르기' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: TEAM_NAMES[teamId], exact: true }).click()
  await expect(sheet).toBeHidden()
}

export async function expectCurrentTeam(page: Page, teamId: TeamId): Promise<void> {
  await expect(teamTrigger(page)).toHaveAccessibleName(`팀 선택: ${TEAM_NAMES[teamId]}`)
}

export function prevTeamButton(page: Page): Locator {
  return page.locator('button.prev-team')
}

export function navLink(page: Page, name: string): Locator {
  return page.getByRole('navigation', { name: '화면' }).getByRole('link', { name, exact: true })
}

/** 예전 설정 화면 자리: 곡 관리 → 「백업·초기화」(화면 이동 없이 앱 안에서) [STEP 3-⑱] */
export async function openSongData(page: Page): Promise<void> {
  await navLink(page, '곡 관리').click()
  await page.getByRole('link', { name: '백업·초기화' }).click()
  await expect(page.getByRole('heading', { name: '백업·초기화' })).toBeVisible()
}

// 칸 묶음은 .field다. 곡 수정 화면 [STEP 3-㉓]은 label이 칸 안의 첫 요소이고, 곡 추가 폼은 label이 칸 자체다
export function formField(page: Page, label: string): Locator {
  return page
    .locator('.field')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('input, select')
    .first()
}

export function formFieldLabel(page: Page, label: string): Locator {
  return page.locator('.field').filter({ has: page.getByText(label, { exact: true }) })
}

export async function gotoHanwha(page: Page): Promise<void> {
  await page.goto('/team/hanwha')
  await expect(page.locator('.player-grid button').first()).toBeVisible()
}

export async function expectPlayerReady(page: Page): Promise<void> {
  await expect.poll(async () => (await ytSnapshot(page)) !== null, { timeout: 20_000 }).toBe(true)
}

/** 곡 관리 목록(선수 탭)에서 곡 줄을 눌러 수정 화면을 연다. 다른 탭 곡은 tab에 종류를 준다 [STEP 3-㉓] */
export async function openEdit(page: Page, teamId: TeamId, title: string, tab: SongKind = 'player'): Promise<void> {
  await page.goto(`/team/${teamId}/songs${tab === 'player' ? '' : `?tab=${tab}`}`)
  await songRow(page, title).locator('.song-item-main').click()
  await expect(page).toHaveURL(/\/edit(\?.*)?$/)
}

/** 곡 관리 목록의 한 줄. 지금 보이는 탭의 곡만 있다 */
export function songRow(page: Page, title: string): Locator {
  return page.locator('.song-item').filter({ has: page.locator('.song-item-title', { hasText: exactText(title) }) })
}

/** 곡 수정 화면 맨 아래의 「곡 삭제」. 삭제는 목록이 아니라 수정 화면에 있다 [STEP 3-㉓] */
export async function deleteFromEdit(page: Page, teamId: TeamId, title: string): Promise<void> {
  await openEdit(page, teamId, title)
  await page.getByRole('button', { name: '곡 삭제' }).click()
}

export async function apiKeyMissing(page: Page): Promise<boolean> {
  return page.getByText('API 키가 없어', { exact: false }).isVisible()
}
