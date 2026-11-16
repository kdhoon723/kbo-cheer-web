//20241476-김도훈-(2026-11-16)
import { existsSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { expectPlayerReady, gotoHanwha, note, nowTitle, playerButton, seedSong, waitPlayingIn } from './helpers.ts'

const LYRICS_DIR = new URL('../media-build/lyrics/', import.meta.url)
const NOH = seedSong('hanwha', '노시환')

async function playNoh(page: Page) {
  await gotoHanwha(page)
  await expectPlayerReady(page)
  await playerButton(page, '노시환').click()
  await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
}

async function playTeamSong(page: Page, title: string) {
  await page.getByRole('tab', { name: /^팀 응원가/ }).first().click()
  await page.locator('.team-song-list').first().getByRole('button', { name: title, exact: true }).click()
  await expect(nowTitle(page)).toHaveText(title)
}

function storedLyricsOpen(page: Page): Promise<unknown> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('kboCheer.settings') ?? '{}').lyricsOpen)
}

async function expectOpen(block: Locator, open: boolean) {
  await expect(block.getByRole('button', { name: open ? '가사 접기' : '가사 보기' })).toHaveAttribute('aria-expanded', String(open))
  await expect(block.locator('.lyrics-text')).toHaveCount(open ? 1 : 0)
}

test.describe('24. 가사 기본으로 펼치기 [STEP 3-㉗]', () => {
  test.skip(!existsSync(LYRICS_DIR), '가사 폴더(media-build/lyrics)가 없는 실행. npm run media 뒤에 돈다')

  test('TC-155 넓은 화면: 처음엔 펼침, 접으면 다른 곡·새로고침에도 접힘, 다시 펼치면 펼침 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await playNoh(page)
    const block = page.locator('.player-lyrics')
    await expectOpen(block, true)
    await block.getByRole('button', { name: '가사 접기' }).click()
    await expectOpen(block, false)
    expect(await storedLyricsOpen(page)).toBe(false)

    await playTeamSong(page, '불타는 태양')
    await expectOpen(block, false)
    // 새로고침 뒤에는 곡을 틀 때 가사를 받는다(BR-59). 그때도 접힌 채다
    await playNoh(page)
    await expectOpen(block, false)

    await block.getByRole('button', { name: '가사 보기' }).click()
    await expectOpen(block, true)
    expect(await storedLyricsOpen(page)).toBe(true)
    await playNoh(page)
    await expectOpen(block, true)
  })

  test('TC-156 가사가 가장 긴 곡을 틀어도 누르는 자리가 그대로이고 가사는 칸 안에서 스크롤한다 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/team/lg')
    await expectPlayerReady(page)
    const places = () =>
      page.evaluate(() => {
        const at = (e: Element) => {
          const r = e.getBoundingClientRect()
          return [Math.round(r.left), Math.round(r.top)]
        }
        const buttons = [...document.querySelectorAll<HTMLElement>('.player-panel .dock button')].filter((b) => b.offsetParent)
        const tools = document.querySelector('.player-tools')
        return {
          buttons: buttons.map((b) => [b.textContent?.trim() || b.getAttribute('aria-label'), ...at(b)]),
          tools: tools ? at(tools) : null,
        }
      })
    // 가사가 없는 곡(오스틴)
    await playerButton(page, '오스틴').click()
    await expect(nowTitle(page)).toHaveText('오스틴')
    await expect(page.locator('.player-lyrics')).toHaveCount(0)
    const without = await places()
    // 가사가 가장 긴 곡(67줄)
    await playTeamSong(page, '엘팬의 북소리')
    await expect(page.locator('.player-lyrics .lyrics-text')).toBeVisible()
    const withLyrics = await places()
    note(testInfo, '누르는 자리(가사 없음 / 가장 긴 가사)', { without, withLyrics })
    expect(withLyrics).toEqual(without)
    expect(without.buttons.map((b) => b[0])).toEqual(expect.arrayContaining(['응원가로', '정지']))

    const scroll = await page.evaluate(() => {
      const body = document.querySelector('.player-lyrics .lyrics-body')
      const lyrics = document.querySelector('.player-lyrics')
      return {
        body: body ? [body.scrollHeight, body.clientHeight] : null,
        boxHeight: lyrics ? Math.round(lyrics.getBoundingClientRect().height) : null,
      }
    })
    note(testInfo, '가사 칸', scroll)
    expect(scroll.boxHeight).toBe(280)
    expect(scroll.body?.[0]).toBeGreaterThan(scroll.body?.[1] ?? Infinity)
  })

  test.describe('휴대폰', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('TC-157 지금 재생 시트: 처음엔 펼침, 시트에서 접으면 다음 곡도 접힘 [YT]', async ({ page }) => {
      test.setTimeout(90_000)
      await playNoh(page)
      const sheet = page.getByRole('dialog', { name: '지금 재생' })
      await page.locator('button.now-open').click()
      await expectOpen(sheet, true)
      await sheet.getByRole('button', { name: '가사 접기' }).click()
      await expectOpen(sheet, false)
      await page.keyboard.press('Escape')
      await expect(sheet).toBeHidden()

      await playTeamSong(page, '불타는 태양')
      await page.locator('button.now-open').click()
      await expectOpen(sheet, false)
    })
  })
})
