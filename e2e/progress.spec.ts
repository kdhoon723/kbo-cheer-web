//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  PAUSED,
  expectPlayerReady,
  gotoHanwha,
  note,
  nowLabel,
  playerButton,
  seedSong,
  waitNotPlaying,
  waitPlayingIn,
  ytSnapshot,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
const LEN = NOH.end - NOH.start
const at = (ratio: number) => NOH.start + ratio * LEN

async function startNoh(page: Page) {
  await gotoHanwha(page)
  await expectPlayerReady(page)
  await playerButton(page, '노시환').click()
  await waitPlayingIn(page, { start: NOH.start + 1, end: NOH.end, videoId: NOH.videoId })
}

async function clickAt(page: Page, slider: Locator, ratio: number) {
  const box = await slider.boundingBox()
  if (!box) throw new Error('막대 위치를 알 수 없음')
  await page.mouse.click(box.x + box.width * ratio, box.y + box.height / 2)
}

/** 옮긴 뒤 플레이어 위치가 target ±1초 안에 오기를 기다린다 */
async function expectAt(page: Page, target: number) {
  await expect
    .poll(async () => Math.abs(((await ytSnapshot(page))?.time ?? -99) - target) <= 1.2, { timeout: 5_000 })
    .toBe(true)
}

test.describe('22. 진행 막대 [STEP 3-㉕]', () => {
  test('TC-141 넓은 화면 막대: 누르기·끌기·키보드, 옮긴 뒤 응원가로 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await startNoh(page)
    const slider = page.getByRole('slider', { name: '재생 위치' })
    await expect(slider).toHaveAttribute('aria-valuemax', String(LEN))
    const box = await slider.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)

    await clickAt(page, slider, 0.5)
    await expectAt(page, at(0.5))
    note(testInfo, '50% 누른 뒤 위치', (await ytSnapshot(page))?.time.toFixed(2))

    if (!box) throw new Error('막대 위치를 알 수 없음')
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 6 })
    await expect(page.locator('.dock .progress-label')).toBeVisible()
    await expect(page.locator('.dock .progress-label')).toHaveText(/^00:4[0-3]$/)
    await page.mouse.up()
    await expectAt(page, at(0.7))

    // 키보드: 막대에 포커스가 있을 때만 방향키가 막대를 움직인다
    await slider.focus()
    const before = (await ytSnapshot(page))?.time ?? 0
    await page.keyboard.press('ArrowRight')
    await expectAt(page, before + 5)
    await page.keyboard.press('Home')
    await expectAt(page, NOH.start)
    await expect(slider).toHaveAttribute('aria-valuetext', /^00:0\d \/ 01:01$/)

    // 옮긴 뒤에도 「응원가로」가 응원가 시작으로 간다
    await page.locator('button.skip-btn').click()
    const cheer = NOH.cheerStart ?? 0
    await waitPlayingIn(page, { start: cheer, end: cheer + 3 })
  })

  test('TC-142 일시정지 중 옮기면 일시정지를 지키고 「이어서」로 그 자리부터 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await startNoh(page)
    await page.evaluate(() => window.YT?.get?.('yt-player')?.pauseVideo())
    await expect(nowLabel(page)).toHaveText('일시정지')
    const slider = page.getByRole('slider', { name: '재생 위치' })
    await clickAt(page, slider, 0.3)
    await expectAt(page, at(0.3))
    await page.waitForTimeout(800)
    expect((await ytSnapshot(page))?.state).toBe(PAUSED)
    await expect(nowLabel(page)).toHaveText('일시정지')
    await page.getByRole('button', { name: '이어서' }).click()
    await waitPlayingIn(page, { start: at(0.3) - 1, end: at(0.3) + 1.5, videoId: NOH.videoId })
  })

  test('TC-143 끝 바로 앞(End)으로 옮겨도 끝 시각에서 멈춘다 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await startNoh(page)
    const slider = page.getByRole('slider', { name: '재생 위치' })
    await slider.focus()
    await page.keyboard.press('End')
    await expectAt(page, NOH.end - 2)
    await expect(nowLabel(page)).toHaveText('멈춤', { timeout: 10_000 })
    const s = await ytSnapshot(page)
    note(testInfo, '끝난 뒤 플레이어', s)
    expect(s?.time ?? Infinity).toBeLessThan(NOH.end + 1)
  })

  test('TC-144 곡이 없거나 멈춤이면 옮길 수 없다 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await gotoHanwha(page)
    await expect(page.getByRole('slider', { name: '재생 위치' })).toHaveCount(0)
    await expectPlayerReady(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
    await expect(page.getByRole('slider', { name: '재생 위치' })).toHaveCount(1)
    await page.getByRole('button', { name: '정지' }).click()
    await waitNotPlaying(page, 3_000)
    await expect(nowLabel(page)).toHaveText('멈춤')
    await expect(page.getByRole('slider', { name: '재생 위치' })).toHaveCount(0)
  })

  test.describe('휴대폰', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

    test('TC-145 지금 재생 시트에서 터치로 옮기고, 재생 줄의 얇은 막대는 시트만 연다 [YT]', async ({ page }, testInfo) => {
      test.setTimeout(90_000)
      await startNoh(page)
      // 재생 줄의 얇은 막대는 옮기기가 아니다
      await expect(page.locator('.dock .progress-hit.is-seekable')).toHaveCount(0)
      const thin = await page.locator('.dock-progress').boundingBox()
      if (!thin) throw new Error('재생 줄 막대 위치를 알 수 없음')
      const beforeTap = (await ytSnapshot(page))?.time ?? 0
      await page.touchscreen.tap(thin.x + thin.width * 0.9, thin.y + thin.height / 2)
      const sheet = page.getByRole('dialog', { name: '지금 재생' })
      await expect(sheet).toBeVisible()
      const afterTap = (await ytSnapshot(page))?.time ?? 0
      note(testInfo, '얇은 막대 누르기 전후', { beforeTap, afterTap })
      expect(afterTap - beforeTap).toBeLessThan(3)

      const slider = sheet.getByRole('slider', { name: '재생 위치' })
      const box = await slider.boundingBox()
      if (!box) throw new Error('시트 막대 위치를 알 수 없음')
      expect(box.height).toBeGreaterThanOrEqual(44)
      const cdp = await page.context().newCDPSession(page)
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x?: number) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x === undefined ? [] : [{ x, y: box.y + box.height / 2 }] })
      await touch('touchStart', box.x + box.width * 0.2)
      for (let i = 1; i <= 6; i++) await touch('touchMove', box.x + box.width * (0.2 + (0.6 * i) / 6))
      await expect(sheet.locator('.progress-label')).toBeVisible()
      await touch('touchEnd')
      await expectAt(page, at(0.8))
      note(testInfo, '터치로 옮긴 뒤 위치', (await ytSnapshot(page))?.time.toFixed(2))
    })
  })
})
