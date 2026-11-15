//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import type { TeamId } from '../src/types.ts'
import {
  apiKeyMissing,
  countDataApiCalls,
  formField,
  formFieldLabel,
  note,
  presetSongs,
  seedSongs,
  situationButton,
  storedSongs,
  toast,
} from './helpers.ts'

const HANWHA_URL = 'https://www.youtube.com/watch?v=0OUzosfuD0s&pp=ygUW7ZWc7ZmUIOydkeybkOqwgCDrqqjsnYw%3D'
const DOOSAN_URL = 'https://www.youtube.com/watch?v=jHxEtjKhJvA'

interface RowView {
  title: string
  startText: string
  endText: string
  warning: boolean
  checked: boolean
  badges: string[]
  link: string | null
}

async function candidateRows(page: Page): Promise<RowView[]> {
  return page.locator('.candidate').evaluateAll((items) =>
    items.map((li) => {
      const input = (label: string) => li.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)?.value ?? ''
      return {
        title: input('이름'),
        startText: input('시작 시각'),
        endText: li.querySelector('.candidate-end')?.textContent ?? '',
        warning: li.classList.contains('candidate-warning'),
        checked: li.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked ?? false,
        badges: Array.from(li.querySelectorAll('.badge')).map((b) => b.textContent ?? ''),
        link: li.querySelector('.candidate-warn-detail a')?.getAttribute('href') ?? null,
      }
    }),
  )
}

async function openImport(page: Page, teamId: TeamId): Promise<void> {
  await page.goto(`/team/${teamId}/import`)
  await expect(page.getByRole('heading', { name: /^곡 가져오기/ })).toBeVisible()
}

async function skipWithoutKey(page: Page): Promise<void> {
  test.skip(await apiKeyMissing(page), 'API 키가 없어 가져오기 화면이 비활성')
}

async function load(page: Page, url: string): Promise<void> {
  await page.getByRole('textbox', { name: 'YouTube 영상 주소' }).fill(url)
  await page.getByRole('button', { name: '불러오기' }).click()
}

function reportCalls(testInfo: TestInfo, calls: () => number): void {
  note(testInfo, 'Data API 호출 수', calls())
}

test.describe('5. 곡 등록', () => {
  test('TC-27 잘못된 URL', async ({ page }) => {
    const calls = countDataApiCalls(page)
    await openImport(page, 'hanwha')
    await skipWithoutKey(page)
    await load(page, 'https://example.com/watch?v=0OUzosfuD0s')
    await expect(page.getByText('YouTube 영상 주소를 넣어 주세요')).toBeVisible()
    await page.waitForTimeout(1_000)
    expect(calls()).toBe(0)
  })

  test('TC-28 모음 영상 가져오기 [API]', async ({ page }, testInfo) => {
    const calls = countDataApiCalls(page)
    await presetSongs(
      page,
      seedSongs().filter((s) => s.teamId !== 'hanwha'),
    )
    await openImport(page, 'hanwha')
    await skipWithoutKey(page)
    await load(page, HANWHA_URL)
    await expect(page.locator('.import-summary')).toHaveText('선수 22 · 상황 4 · 팀 응원가 18 / 저장 44곡', {
      timeout: 15_000,
    })
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(toast(page)).toHaveText(/44곡을 저장했습니다/)
    const hanwha = (await storedSongs(page)).filter((s) => s.teamId === 'hanwha')
    note(testInfo, '저장 뒤 한화 곡 수', hanwha.length)
    expect(hanwha).toHaveLength(44)
    await expect(page.locator('.player-grid button')).toHaveCount(22)
    await page.getByRole('tab', { name: /^팀 응원가/ }).click()
    await expect(page.locator('.team-song-list button')).toHaveCount(18)
    await expect(page.locator('.dock-situations .situation-btn')).toHaveCount(4)
    reportCalls(testInfo, calls)
  })

  test('TC-29 시각 역행 경고와 교정 [API]', async ({ page }, testInfo) => {
    const calls = countDataApiCalls(page)
    await presetSongs(
      page,
      seedSongs().filter((s) => s.teamId !== 'doosan'),
    )
    await openImport(page, 'doosan')
    await skipWithoutKey(page)
    await load(page, DOOSAN_URL)
    await expect(page.locator('.import-summary')).toBeVisible({ timeout: 15_000 })

    const before = await candidateRows(page)
    const warned = before.filter((r) => r.warning)
    note(testInfo, '경고 줄', warned)
    expect(warned).toHaveLength(1)
    expect(warned[0].startText).toBe('30:36')
    expect(warned[0].link).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=jHxEtjKhJvA&t=\d+s$/)
    expect(warned[0].checked).toBe(false)
    const champBefore = before.find((r) => r.title === '챔피언 두산')
    note(testInfo, '고치기 전 챔피언 두산', champBefore)
    expect(champBefore?.endText).toBe('끝 42:05')

    await page.locator('.candidate-warning input[aria-label="시작 시각"]').fill('40:36')
    await expect(page.locator('.candidate-warning')).toHaveCount(0)
    const after = await candidateRows(page)
    const champ = after.find((r) => r.title === '챔피언 두산')
    const fixed = after.find((r) => r.title === warned[0].title)
    note(testInfo, '고친 뒤 챔피언 두산·고친 줄', { champ, fixed })
    expect(champ?.startText).toBe('39:15')
    expect(champ?.endText).toBe('끝 40:36')
    expect(fixed?.startText).toBe('40:36')
    expect(fixed?.checked).toBe(true)
    reportCalls(testInfo, calls)
  })

  test('TC-30 다시 가져오기 [API]', async ({ page }, testInfo) => {
    const calls = countDataApiCalls(page)
    await openImport(page, 'hanwha')
    await skipWithoutKey(page)
    await load(page, HANWHA_URL)
    await expect(page.locator('.import-summary')).toHaveText('선수 0 · 상황 0 · 팀 응원가 0 / 저장 0곡', {
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled()
    const rows = await candidateRows(page)
    const existing = rows.filter((r) => r.badges.includes('이미 있음'))
    const duplicate = rows.filter((r) => r.badges.includes('같은 상황 곡 있음(저장 안 함)'))
    note(testInfo, '후보 수·이미 있음·같은 상황 곡 있음', {
      rows: rows.length,
      existing: existing.length,
      duplicate: duplicate.map((r) => `${r.startText} ${r.title}`),
    })
    expect(existing).toHaveLength(44)
    // 처음부터 빠졌던 줄은 모두 중복 안타 송이다
    const fresh = rows.filter((r) => !r.badges.includes('이미 있음'))
    expect(fresh.length).toBeGreaterThan(0)
    expect(fresh.every((r) => r.title === '공통 안타 송' && r.badges.includes('같은 상황 곡 있음(저장 안 함)'))).toBe(true)
    // 이미 있는 상황 곡도 팀에 같은 제목이 있으므로 다시 고를 수 없다(K-05). 한화 상황 곡은 4곡이다
    expect(duplicate.filter((r) => r.badges.includes('이미 있음')).map((r) => r.title).sort()).toEqual(
      ['공통 안타 송', '라인업송', '볼넷 송', '풀카운트 송'],
    )
    expect(rows.every((r) => !r.checked)).toBe(true)
    reportCalls(testInfo, calls)
  })

  test('TC-31 없는 영상 [API]', async ({ page }, testInfo) => {
    const calls = countDataApiCalls(page)
    await openImport(page, 'hanwha')
    await skipWithoutKey(page)
    await load(page, 'https://www.youtube.com/watch?v=AAAAAAAAAAA')
    await expect(page.getByText('영상을 찾을 수 없습니다')).toBeVisible({ timeout: 15_000 })
    reportCalls(testInfo, calls)
  })

  test('TC-32 단일 영상 등록과 검증 [API]', async ({ page }, testInfo) => {
    const calls = countDataApiCalls(page)
    await openImport(page, 'hanwha')
    await skipWithoutKey(page)
    await load(page, 'https://youtu.be/Q59hw6HP8Ns')
    await expect(page.getByText('설명란에서 챕터를 찾지 못했습니다. 곡 한 개로 등록합니다')).toBeVisible({
      timeout: 15_000,
    })
    await expect(formField(page, '영상 ID')).toHaveValue('Q59hw6HP8Ns')
    await expect(formField(page, '끝')).toHaveValue('00:16')
    await formField(page, '이름').fill('풀카운트 송')
    await expect(formFieldLabel(page, '이름')).toContainText(
      '같은 제목의 상황 곡이 이미 있습니다. 상황 버튼이 두 개 생깁니다',
    )
    await formField(page, '끝').fill('00:20')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(formFieldLabel(page, '끝')).toContainText('끝 시각은 영상 길이(00:16) 이하여야 합니다')
    await expect(page).toHaveURL(/\/team\/hanwha\/import$/)
    expect(await storedSongs(page)).toHaveLength(507)

    await formField(page, '끝').fill('00:16')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(toast(page)).toHaveText(/1곡을 저장했습니다/)
    const songs = await storedSongs(page)
    const added = songs.filter((s) => s.videoId === 'Q59hw6HP8Ns')
    note(testInfo, '저장된 곡', added)
    expect(songs).toHaveLength(508)
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ teamId: 'hanwha', kind: 'situation', title: '풀카운트 송', start: 0, end: 16 })
    await expect(situationButton(page, '풀카운트 송')).toHaveCount(2)
    reportCalls(testInfo, calls)
  })
})
