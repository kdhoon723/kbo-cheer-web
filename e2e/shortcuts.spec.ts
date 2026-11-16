//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import {
  PLAYING,
  expectPlayerReady,
  gotoHanwha,
  note,
  nowTitle,
  playerButton,
  presetSongs,
  seedSong,
  seedSongs,
  pickTeam,
  waitNotPlaying,
  waitPlayingIn,
  ytSnapshot,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
const LINEUP = seedSong('hanwha', '라인업송')
const HIT = seedSong('hanwha', '공통 안타 송')
const CHEER_AT = 440

test.describe('8. 키보드 단축키', () => {
  test('TC-49 단축키 동작', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    // [STEP 3-⑫] T가 전 팀으로 가는 것은 한 팀 화면(1199px 이하)이다. 보드에서 T는 상황 칸의 팀을 바꾼다(TC-90)
    await page.setViewportSize({ width: 1024, height: 768 })
    await presetSongs(
      page,
      seedSongs().map((s) => (s.id === NOH.id ? { ...s, cheerStart: CHEER_AT } : s)),
    )
    await page.goto('/team/samsung')
    await pickTeam(page, 'hanwha')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expectPlayerReady(page)
    const search = page.locator('.search-box')

    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end })

    await page.keyboard.press('s')
    const cheer = await waitPlayingIn(page, { start: CHEER_AT, end: CHEER_AT + 3 }, 5_000)
    note(testInfo, 'S 뒤 위치', cheer.time.toFixed(2))

    await page.keyboard.press('Space')
    const stopped = await waitNotPlaying(page, 3_000)
    note(testInfo, 'Space 뒤 상태', stopped)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')

    await page.keyboard.press('/')
    await expect(search).toBeFocused()
    await page.keyboard.type('노시')
    await expect(search).toHaveValue('노시')

    await page.keyboard.press('Escape')
    await expect(search).toHaveValue('')
    await expect(search).not.toBeFocused()

    await page.keyboard.press('1')
    await expect(nowTitle(page)).toHaveText('공통 안타 송')
    await waitPlayingIn(page, { start: HIT.start, end: HIT.end })
    await page.keyboard.press('2')
    await page.waitForTimeout(500)
    await expect(nowTitle(page), '한화의 2번(아웃) 칸은 비어 있어 그대로다').toHaveText('공통 안타 송')
    await page.keyboard.press('5')
    await expect(nowTitle(page)).toHaveText('라인업송')
    await waitPlayingIn(page, { start: LINEUP.start, end: LINEUP.end })

    await page.keyboard.press('t')
    await expect(page).toHaveURL(/\/team\/samsung$/)
  })

  test('TC-50 입력칸에서는 Esc만', async ({ page }) => {
    await page.goto('/team/samsung')
    await pickTeam(page, 'hanwha')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    const search = page.locator('.search-box')
    await search.click()
    await page.keyboard.press('s')
    await page.keyboard.press('1')
    await page.keyboard.press('t')
    await expect(search).toHaveValue('s1t')
    await expect(search).toBeFocused()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await page.waitForTimeout(1_000)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')

    await page.keyboard.press('Escape')
    await expect(search).toHaveValue('')
    await expect(search).not.toBeFocused()
  })

  test('TC-51 버튼 클릭 뒤 Space', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end })
    await page.keyboard.press('Space')
    await waitNotPlaying(page, 3_000)
    await page.waitForTimeout(2_500)
    const s = await ytSnapshot(page)
    note(testInfo, 'Space 2.5초 뒤 상태', s)
    expect(s?.state).not.toBe(PLAYING)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
  })
})
