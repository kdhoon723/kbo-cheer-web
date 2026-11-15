//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import {
  PLAYING,
  expectPlayerReady,
  formField,
  gotoHanwha,
  note,
  nowTitle,
  playerButton,
  presetSongs,
  seedSong,
  songRow,
  teamTrigger,
  toast,
  waitPlayingIn,
  ytSnapshot,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')

test.describe('11. 오류 수정 회귀', () => {
  test('TC-61 플레이어 준비 실패 뒤 복구(K-01)', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    // 스크립트는 받고 영상 iframe만 막아 onReady가 오지 않게 한다
    await page.route('https://www.youtube.com/embed/**', (route) => route.abort())
    await page.goto('/team/hanwha')
    await playerButton(page, '노시환').click()
    await expect(toast(page)).toHaveText('플레이어를 불러오지 못했습니다', { timeout: 15_000 })
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')

    await page.unroute('https://www.youtube.com/embed/**')
    await playerButton(page, '노시환').click()
    const played = await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId }, 30_000)
    note(testInfo, '다시 누른 뒤 재생 위치(초)', played.time.toFixed(2))
    await expect(nowTitle(page)).toHaveText('노시환')
  })

  test('TC-62 재생 직후 실제 일시정지(K-02)', async ({ page }, testInfo) => {
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await playerButton(page, '노시환').click()
    const played = await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
    // 불러온 지 1.5초 안에 플레이어 밖에서 멈춘 경우다. 예전에는 이전 로드의 신호로 보고 버렸다
    const sinceLoad = await page.evaluate(() => {
      window.YT?.get?.('yt-player')?.pauseVideo()
      return performance.now()
    })
    note(testInfo, '재생 확인까지(ms)', played.waitedMs)
    note(testInfo, '일시정지 시각(performance.now)', Math.round(sinceLoad))
    await expect(toast(page)).toHaveText('재생이 멈췄습니다')
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
  })

  test('TC-63 설정 저장 실패 알림(K-03)', async ({ page }) => {
    await gotoHanwha(page)
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'kboCheer.settings' || key === 'kboCheer.team') throw new DOMException('full', 'QuotaExceededError')
        original.call(this, key, value)
      }
    })
    await page.getByRole('button', { name: '가나다 순' }).click()
    await expect(toast(page)).toHaveText('설정을 저장하지 못했습니다. 새로고침하면 팀·볼륨·정렬이 이전 값으로 돌아갈 수 있습니다')
    await toast(page).click()
    await expect(toast(page)).toHaveCount(0)
    // 다시 성공할 때까지 같은 알림을 되풀이하지 않는다
    await page.getByRole('button', { name: '챕터 순' }).click()
    await page.waitForTimeout(500)
    await expect(toast(page)).toHaveCount(0)
  })

  test('TC-64 슬래시가 든 곡 id의 수정 화면(K-04)', async ({ page }) => {
    await presetSongs(page, [{ ...NOH, id: 'a/b' }])
    await page.goto('/team/hanwha/songs')
    await songRow(page, '노시환').getByRole('button', { name: '수정' }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs\/a%2Fb\/edit$/)
    await expect(page.getByRole('heading', { name: /^곡 수정/ })).toBeVisible()
    await expect(formField(page, '이름')).toHaveValue('노시환')
  })

  test('TC-65 팀 고르기 창에서 Space로 고르기(K-07)', async ({ page }) => {
    await gotoHanwha(page)
    await teamTrigger(page).click()
    const sheet = page.getByRole('dialog', { name: '팀 고르기' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: '삼성', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(sheet).toBeHidden()
    expect((await ytSnapshot(page))?.state).not.toBe(PLAYING)
  })
})
