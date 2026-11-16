//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  expectPlayerReady,
  nowTitle,
  presetStorage,
  seedSong,
  waitNotPlaying,
  waitPlayingIn,
} from './helpers.ts'

const TEAM_KEY = 'kboCheer.team'
const NOH = seedSong('hanwha', '노시환')
const DIAZ = seedSong('samsung', '디아즈')
const HANWHA_HIT = seedSong('hanwha', '공통 안타 송')
const SAMSUNG_HIT = seedSong('samsung', '공통 안타 송')

function column(page: Page, n: 0 | 1): Locator {
  return page.locator('.board-column').nth(n)
}

function columnPlayer(page: Page, n: 0 | 1, title: string): Locator {
  return column(page, n).locator('.player-grid').getByRole('button', { name: title, exact: true })
}

async function storedTeams(page: Page): Promise<unknown> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const { currentTeamId, prevTeamId }: { currentTeamId: unknown; prevTeamId: unknown } = JSON.parse(raw)
    return { currentTeamId, prevTeamId }
  }, TEAM_KEY)
}

async function presetMatchup(page: Page, currentTeamId: string, prevTeamId: string | null): Promise<void> {
  await presetStorage(page, TEAM_KEY, JSON.stringify({ version: 1, currentTeamId, prevTeamId }))
}

/** 지금 iframe에 표시를 붙인다. 같은 표시가 남아 있으면 iframe을 다시 만들지 않은 것이다 */
async function markPlayerFrame(page: Page): Promise<void> {
  await page.locator('.player-host iframe').evaluate((el) => el.setAttribute('data-e2e-frame', 'first'))
}

async function expectSamePlayerFrame(page: Page, why: string): Promise<void> {
  await expect(page.locator('.player-host iframe'), why).toHaveCount(1)
  await expect(page.locator('.player-host iframe'), why).toHaveAttribute('data-e2e-frame', 'first')
}

test.describe('13. 매치업 보드와 선수 카드 [STEP 3-⑫]', () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  // 선수 카드를 보는 테스트다. [STEP 3-㉙] 가사를 펼쳐 두면 카드 자리에 가사가 들어가므로 접어 둔다
  test.beforeEach(async ({ page }) => {
    await presetStorage(page, 'kboCheer.settings', JSON.stringify({ version: 1, volume: 100, lyricsOpen: false }))
  })

  test('TC-89 두 열에서 차례로 재생 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await presetMatchup(page, 'hanwha', 'samsung')
    await page.goto('/team/hanwha')
    await expect(page.getByRole('button', { name: '팀 선택: 한화' })).toBeVisible()
    await expect(page.getByRole('button', { name: '상대 팀 선택: 삼성' })).toBeVisible()
    await expect(page.locator('button.prev-team')).toBeHidden()
    await expect(column(page, 0)).toHaveAccessibleName('한화 곡')
    await expect(column(page, 1)).toHaveAccessibleName('삼성 곡')
    await expectPlayerReady(page)
    await markPlayerFrame(page)

    await columnPlayer(page, 0, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
    await expect(page.locator('.player-card .card-name')).toHaveText('노시환')
    await expect(page.locator('.player-card .card-sub')).toHaveText('한화 · 3루수')

    await columnPlayer(page, 1, '디아즈').click()
    await waitPlayingIn(page, { start: DIAZ.start, end: DIAZ.end, videoId: DIAZ.videoId })
    await expect(page.locator('.player-card .card-name')).toHaveText('디아즈')
    await expect(page.locator('.player-card .card-sub')).toHaveText('삼성 · 1루수')
    await expect(columnPlayer(page, 1, '디아즈')).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(column(page, 0)).toHaveAccessibleName('한화 곡')
    await expect(column(page, 1)).toHaveAccessibleName('삼성 곡')
    expect(await storedTeams(page)).toEqual({ currentTeamId: 'hanwha', prevTeamId: 'samsung' })

    // 팀 색 판 위에는 글자가 없고 로고 판만 있다
    await expect(page.locator('.player-card .card-plate')).toHaveText('')
    await expect(page.locator('.player-card .card-team img')).toHaveAttribute('src', '/teams/samsung.webp')

    await page.getByRole('button', { name: '상대 팀 선택: 삼성' }).click()
    const sheet = page.getByRole('dialog', { name: '상대 팀 고르기' })
    await expect(sheet.getByRole('button', { name: '삼성', exact: true })).toBeFocused()
    await sheet.getByRole('button', { name: 'KIA', exact: true }).click()
    await expect(sheet).toBeHidden()
    await expect(column(page, 1)).toHaveAccessibleName('KIA 곡')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    expect(await storedTeams(page)).toEqual({ currentTeamId: 'hanwha', prevTeamId: 'kia' })
    await expectSamePlayerFrame(page, '오른쪽 열의 팀을 바꿔도 iframe은 그대로')

    await page.setViewportSize({ width: 360, height: 640 })
    await expect(page.locator('.board')).toHaveCount(0)
    await expect(page.locator('button.prev-team')).toHaveAccessibleName('전 팀: KIA')
    await expectSamePlayerFrame(page, '휴대폰 배치로 바뀌어도 iframe은 그대로')
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('.board')).toBeVisible()
    await expectSamePlayerFrame(page, '보드로 돌아와도 iframe은 그대로')
    await waitPlayingIn(page, { start: DIAZ.start, end: DIAZ.end, videoId: DIAZ.videoId })
  })

  test('TC-90 상황 칸 팀 탭과 단축키 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await presetMatchup(page, 'hanwha', 'samsung')
    await page.goto('/team/hanwha')
    await expectPlayerReady(page)
    const tabs = page.getByRole('tablist', { name: '상황 칸 팀' })
    await expect(tabs.getByRole('tab', { name: '한화' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.shortcut-hint')).toContainText('T 상황 팀')

    await columnPlayer(page, 1, '디아즈').click()
    await expect(tabs.getByRole('tab', { name: '삼성' })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('1')
    await waitPlayingIn(page, { start: SAMSUNG_HIT.start, end: SAMSUNG_HIT.end, videoId: SAMSUNG_HIT.videoId })
    await expect(page.locator('.player-card .card-sub')).toHaveText('삼성 · 상황')

    await tabs.getByRole('tab', { name: '한화' }).click()
    await expect(page.locator('#situation-panel')).toHaveAttribute('aria-labelledby', 'situation-tab-hanwha')
    await page.keyboard.press('1')
    await waitPlayingIn(page, { start: HANWHA_HIT.start, end: HANWHA_HIT.end, videoId: HANWHA_HIT.videoId })
    await expect(page.locator('.player-card .card-sub')).toHaveText('한화 · 상황')
    await expect(nowTitle(page)).toHaveText('공통 안타 송')

    await page.keyboard.press('t')
    await expect(tabs.getByRole('tab', { name: '삼성' })).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(column(page, 0)).toHaveAccessibleName('한화 곡')
  })

  test('TC-91 상대 팀 고르기와 왼쪽 팀 바꾸기', async ({ page }) => {
    await page.goto('/team/hanwha')
    await expect(column(page, 1)).toHaveAccessibleName('상대 팀')
    await expect(column(page, 1).locator('.player-grid')).toHaveCount(0)
    await expect(page.getByRole('tablist', { name: '상황 칸 팀' })).toHaveCount(0)
    await page.getByRole('button', { name: '상대 팀 고르기' }).click()
    const sheet = page.getByRole('dialog', { name: '상대 팀 고르기' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: '삼성', exact: true }).click()
    await expect(sheet).toBeHidden()
    await expect(column(page, 1)).toHaveAccessibleName('삼성 곡')
    await expect(columnPlayer(page, 1, '디아즈')).toBeVisible()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    expect(await storedTeams(page)).toEqual({ currentTeamId: 'hanwha', prevTeamId: 'samsung' })

    await page.getByRole('button', { name: '팀 선택: 한화' }).click()
    await page.getByRole('dialog', { name: '팀 고르기' }).getByRole('button', { name: 'KIA', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/kia$/)
    await expect(column(page, 0)).toHaveAccessibleName('KIA 곡')
    await expect(column(page, 1)).toHaveAccessibleName('삼성 곡')
    expect(await storedTeams(page)).toEqual({ currentTeamId: 'kia', prevTeamId: 'samsung' })

    // 다른 칸의 팀을 고르면 두 칸이 맞바뀐다
    await page.getByRole('button', { name: '상대 팀 선택: 삼성' }).click()
    await page.getByRole('dialog', { name: '상대 팀 고르기' }).getByRole('button', { name: 'KIA', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(column(page, 0)).toHaveAccessibleName('삼성 곡')
    await expect(column(page, 1)).toHaveAccessibleName('KIA 곡')
    expect(await storedTeams(page)).toEqual({ currentTeamId: 'samsung', prevTeamId: 'kia' })
  })

  test('TC-92 휴대폰 지금 재생 시트 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/team/hanwha')
    await expectPlayerReady(page)
    const open = page.locator('button.now-open')
    await expect(open, '곡을 틀기 전에는 열 것이 없다').toBeDisabled()

    await page.locator('.player-grid').getByRole('button', { name: '노시환', exact: true }).click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
    await open.click()
    const sheet = page.getByRole('dialog', { name: '지금 재생' })
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('.card-name')).toHaveText('노시환')
    await expect(sheet.locator('.card-sub')).toHaveText('한화 · 3루수')
    await expect(sheet.locator('.now-sheet-time')).toHaveText(/^\d\d:\d\d \/ 01:01/)

    const frame = await page.locator('.player-host iframe').boundingBox()
    const body = await sheet.locator('.sheet-body').boundingBox()
    expect(frame?.width).toBeGreaterThanOrEqual(200)
    expect(frame?.height).toBeGreaterThanOrEqual(200)
    expect(frame && frame.y >= 0).toBe(true)
    expect(frame && body && body.y >= frame.y + frame.height, '시트가 플레이어 아래에서 시작한다').toBe(true)
    const backdrop = await sheet.evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)
    expect(backdrop).toBe('rgba(0, 0, 0, 0)')

    await sheet.getByRole('button', { name: '닫기' }).click()
    await expect(sheet).toBeHidden()

    await page.getByRole('button', { name: '더보기' }).click()
    await expect(page.getByRole('dialog', { name: '재생 도구' })).toBeVisible()
    await expect(sheet).toBeHidden()
    await page.getByRole('dialog', { name: '재생 도구' }).getByRole('button', { name: '닫기' }).click()
    await expect(page.getByRole('dialog', { name: '재생 도구' })).toBeHidden()

    await page.getByRole('button', { name: '정지' }).click()
    await waitNotPlaying(page, 3_000)
    await expect(sheet).toBeHidden()
    // 멈춘 뒤에도 마지막 곡이 재생 줄에 남아 시트를 다시 열 수 있다 [STEP 3-⑳]
    await expect(open).toBeEnabled()
    await expect(open).toHaveAccessibleName('지금 재생 크게 보기: 노시환')
  })
})
