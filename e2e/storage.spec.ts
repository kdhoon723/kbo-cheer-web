//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import {
  APP_ORIGIN,
  SONGS_KEY,
  formField,
  presetStorage,
  songRow,
  storedSongs,
  toast,
} from './helpers.ts'

const FAIL_FLAG = '__e2eFailSongsSave'

test.describe('9. 저장 데이터', () => {
  test('TC-53 깨진 저장 데이터', async ({ page }) => {
    await presetStorage(page, SONGS_KEY, 'not-json')
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '응원할 팀을 고르세요' })).toBeVisible()
    await expect(toast(page)).toHaveText(/저장 데이터가 손상되어 초기화했습니다/)
    expect(await page.evaluate(() => localStorage.getItem('kboCheer.songs.broken'))).toBe('not-json')
    expect(await storedSongs(page)).toHaveLength(507)
  })

  test('TC-54 저장 실패', async ({ page }) => {
    await page.addInitScript(
      ({ origin, key, flag }) => {
        if (location.origin !== origin) return
        const original = Storage.prototype.setItem
        Storage.prototype.setItem = function (k: string, v: string) {
          if (k === key && Reflect.get(window, flag) === true) {
            throw new DOMException('저장 공간 부족 흉내', 'QuotaExceededError')
          }
          original.call(this, k, v)
        }
      },
      { origin: APP_ORIGIN, key: SONGS_KEY, flag: FAIL_FLAG },
    )
    await page.goto('/team/hanwha/songs')
    await expect(songRow(page, '노시환')).toHaveCount(1)
    await page.evaluate((flag) => Reflect.set(window, flag, true), FAIL_FLAG)

    await songRow(page, '노시환').locator('.song-item-main').click()
    await formField(page, '이름').fill('노시환(수정)')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(toast(page)).toHaveText(/저장하지 못했습니다/)
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    await expect(songRow(page, '노시환(수정)')).toHaveCount(1)
    const stored = await storedSongs(page)
    expect(stored.some((s) => s.title === '노시환')).toBe(true)
    expect(stored.some((s) => s.title === '노시환(수정)')).toBe(false)
  })

  test('TC-55 저장소 읽기 불가', async ({ page }) => {
    await page.addInitScript((origin) => {
      if (location.origin !== origin) return
      Storage.prototype.getItem = function () {
        throw new DOMException('저장소 막힘 흉내', 'SecurityError')
      }
    }, APP_ORIGIN)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '응원할 팀을 고르세요' })).toBeVisible()
    await expect(toast(page)).toHaveText(/이 브라우저에서는 저장할 수 없어 새로고침하면 바뀐 내용이 사라집니다/)
    await page.locator('.team-grid').getByRole('button', { name: '한화', exact: true }).click()
    await expect(page.locator('.player-grid button')).toHaveCount(22)
  })
})
