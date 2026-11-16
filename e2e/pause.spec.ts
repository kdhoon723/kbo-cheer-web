//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  PAUSED,
  expectPlayerReady,
  gotoHanwha,
  note,
  nowLabel,
  nowTitle,
  playerButton,
  presetSongs,
  seedSong,
  seedSongs,
  toast,
  waitPlayingIn,
  ytSnapshot,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
// 끝 시각까지 기다리는 시간을 줄이려고 노시환 구간을 10초로 줄인 목록을 쓴다
const SHORT = { ...NOH, end: NOH.start + 10, cheerStart: null }

async function openShort(page: Page) {
  await presetSongs(
    page,
    seedSongs().map((s) => (s.id === NOH.id ? SHORT : s)),
  )
  await gotoHanwha(page)
  await expectPlayerReady(page)
}

async function waitPaused(page: Page): Promise<number> {
  await expect.poll(async () => (await ytSnapshot(page))?.state, { timeout: 5_000 }).toBe(PAUSED)
  return (await ytSnapshot(page))?.time ?? 0
}

/** 일시정지 표시와 알림이 없는 것을 함께 본다 */
async function expectPausedUi(page: Page) {
  await expect(nowLabel(page)).toHaveText('일시정지')
  await expect(nowTitle(page)).toHaveText('노시환')
  await expect(page.getByRole('button', { name: '이어서' })).toBeEnabled()
  await page.waitForTimeout(800)
  await expect(toast(page)).toHaveCount(0)
}

/** 끝 시각에서 멈추고 재생 줄은 마지막 곡 「멈춤」이 된다 */
async function expectEndsAtEnd(page: Page, testInfo: Parameters<Parameters<typeof test>[2]>[1]) {
  await expect(nowLabel(page)).toHaveText('멈춤', { timeout: 15_000 })
  const end = await ytSnapshot(page)
  note(testInfo, '끝난 뒤 플레이어', end)
  expect(end?.state).not.toBe(1)
  expect(end?.time ?? Infinity).toBeLessThan(SHORT.end + 1)
}

test.describe('19. 플레이어를 직접 멈추고 다시 틀기 [STEP 3-㉑]', () => {
  test('TC-122 페이지에서 pauseVideo() → 일시정지 → 「이어서」로 그 자리부터, 끝 시각에서 멈춤 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await openShort(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: SHORT.start + 2, end: SHORT.end, videoId: NOH.videoId })
    await page.evaluate(() => window.YT?.get?.('yt-player')?.pauseVideo())
    const at = await waitPaused(page)
    note(testInfo, '멈춘 위치', at.toFixed(2))
    await expectPausedUi(page)
    await expect(page.locator('.player-grid .is-playing')).toHaveCount(1)

    await page.getByRole('button', { name: '이어서' }).click()
    const again = await waitPlayingIn(page, { start: at - 1, end: at + 1, videoId: NOH.videoId })
    note(testInfo, '이어서 첫 위치', again.time.toFixed(2))
    await expect(nowLabel(page)).toHaveText('지금 재생')
    await expect(page.getByRole('button', { name: '정지' })).toBeEnabled()
    await expectEndsAtEnd(page, testInfo)
  })

  test('TC-123 플레이어 영역을 실제로 눌러 멈추고 다시 눌러 재생 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await openShort(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: SHORT.start + 2, end: SHORT.end, videoId: NOH.videoId })
    const box = await page.locator('.player-host iframe').boundingBox()
    if (!box) throw new Error('플레이어 위치를 알 수 없음')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const at = await waitPaused(page)
    note(testInfo, '눌러 멈춘 위치', at.toFixed(2))
    await expectPausedUi(page)

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const again = await waitPlayingIn(page, { start: at - 1, end: at + 1, videoId: NOH.videoId })
    note(testInfo, '다시 눌러 재생한 첫 위치', again.time.toFixed(2))
    await expect(nowLabel(page)).toHaveText('지금 재생')
    await expectEndsAtEnd(page, testInfo)
  })

  test('TC-124 밖에서 멈추고 밖에서 playVideo() → 앱도 재생 중, 끝 시각에서 멈춤 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await openShort(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: SHORT.start + 2, end: SHORT.end, videoId: NOH.videoId })
    await page.evaluate(() => window.YT?.get?.('yt-player')?.pauseVideo())
    await waitPaused(page)
    await expectPausedUi(page)
    await page.evaluate(() => window.YT?.get?.('yt-player')?.playVideo())
    await expect(nowLabel(page)).toHaveText('지금 재생')
    await expect(page.getByRole('button', { name: '정지' })).toBeEnabled()
    await expectEndsAtEnd(page, testInfo)
    await expect(toast(page)).toHaveCount(0)
  })

  test('TC-125 일시정지 중 Space는 그 곡을 끝내고, 다른 곡은 그대로 튼다 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    const ferraz = seedSong('hanwha', '페라자')
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start + 1, end: NOH.end, videoId: NOH.videoId })
    await page.evaluate(() => window.YT?.get?.('yt-player')?.pauseVideo())
    await waitPaused(page)
    await expect(nowLabel(page)).toHaveText('일시정지')
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Space')
    await expect(nowLabel(page)).toHaveText('멈춤')
    await expect(page.getByRole('button', { name: '다시 재생' })).toBeEnabled()
    expect((await ytSnapshot(page))?.state).not.toBe(1)

    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
    await page.evaluate(() => window.YT?.get?.('yt-player')?.pauseVideo())
    await waitPaused(page)
    await playerButton(page, '페라자').click()
    await waitPlayingIn(page, { start: ferraz.start, end: ferraz.end, videoId: ferraz.videoId })
    await expect(nowTitle(page)).toHaveText('페라자')
    await expect(nowLabel(page)).toHaveText('지금 재생')
  })
})
