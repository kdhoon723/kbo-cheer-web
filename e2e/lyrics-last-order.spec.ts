//20241476-김도훈-(2026-11-16)
import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import type { TeamId } from '../src/types.ts'
import {
  ENDED,
  HISTORY_KEY,
  expectPlayerReady,
  gotoHanwha,
  navLink,
  note,
  nowLabel,
  nowTitle,
  playerButton,
  presetSongs,
  presetStorage,
  seedSong,
  seedSongs,
  songRow,
  teamTrigger,
  waitNotPlaying,
  waitPlayingIn,
  ytSnapshot,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
const DEFAULT_ORDER = ['키움', '한화', '롯데', 'SSG', '두산', 'NC', 'KIA', 'LG', '삼성', 'KT']
const LYRICS_DIR = new URL('../media-build/lyrics/', import.meta.url)

interface LyricRow {
  title: string
  lyrics: string
  source: string
}

function lyricOf(teamId: TeamId, title: string): LyricRow {
  const file: { songs: LyricRow[] } = JSON.parse(readFileSync(new URL(`${teamId}.json`, LYRICS_DIR), 'utf8'))
  const row = file.songs.find((s) => s.title === title)
  if (!row) throw new Error(`가사 없음: ${teamId} ${title}`)
  return row
}

function teamSheet(page: Page): Locator {
  return page.getByRole('dialog', { name: '팀 고르기' })
}

async function sheetOrder(page: Page): Promise<string[]> {
  return teamSheet(page).locator('.team-cell-name').allTextContents()
}

async function center(cell: Locator): Promise<{ x: number; y: number }> {
  const box = await cell.boundingBox()
  if (!box) throw new Error('칸 위치를 알 수 없음')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function storedOrder(page: Page): Promise<unknown> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('kboCheer.settings') ?? '{}').teamOrder)
}

test.describe('16. 가사 [STEP 3-⑳]', () => {
  test.skip(!existsSync(LYRICS_DIR), '가사 폴더(media-build/lyrics)가 없는 실행. npm run media 뒤에 돈다')

  test('TC-110 지금 곡의 가사와 출처 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const requests: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.pathname.startsWith('/lyrics/')) requests.push(url.pathname)
    })
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await page.waitForTimeout(500)
    expect(requests, '곡을 틀기 전에는 가사를 받지 않는다').toEqual([])
    await expect(page.locator('.lyrics')).toHaveCount(0)

    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
    const block = page.locator('.player-lyrics')
    // [STEP 3-㉗] 처음부터 펼쳐져 있다(접기·펼침 기억은 TC-155)
    await expect(block.getByRole('button', { name: '가사 접기' })).toHaveAttribute('aria-expanded', 'true')
    const noh = lyricOf('hanwha', '노시환')
    await expect(block.locator('.lyrics-text')).toHaveText(noh.lyrics)
    const source = block.locator('.lyrics-source a').first()
    await expect(source).toHaveAttribute('href', noh.source)
    await expect(source).toHaveText('나무위키 「한화 이글스/응원가/선수」')
    await expect(block.locator('.lyrics-source')).toContainText('CC BY-NC-SA 2.0 KR')

    // 가사가 없는 곡은 가사 칸이 없다. 같은 팀의 다른 곡은 받은 파일을 다시 쓰고, 펼친 상태는 곡이 바뀌어도 남는다
    await page.getByRole('tab', { name: /^팀 응원가/ }).first().click()
    const teamList = page.locator('.team-song-list').first()
    await teamList.getByRole('button', { name: '행복송', exact: true }).click()
    await expect(nowTitle(page)).toHaveText('행복송')
    await expect(page.locator('.lyrics')).toHaveCount(0)
    await teamList.getByRole('button', { name: '불타는 태양', exact: true }).click()
    await expect(nowTitle(page)).toHaveText('불타는 태양')
    await expect(block.locator('.lyrics-text')).toHaveText(lyricOf('hanwha', '불타는 태양').lyrics)
    note(testInfo, '가사 요청', requests)
    expect(requests).toEqual(['/lyrics/hanwha.json'])

    // 휴대폰은 지금 재생 시트 안에 있다
    await page.setViewportSize({ width: 360, height: 640 })
    await expect(block).toBeHidden()
    await page.locator('button.now-open').click()
    const sheet = page.getByRole('dialog', { name: '지금 재생' })
    await expect(sheet.locator('.lyrics-text')).toHaveText(lyricOf('hanwha', '불타는 태양').lyrics)
  })
})

test.describe('17. 마지막 곡 유지 [STEP 3-⑳]', () => {
  test('TC-111 정지한 뒤 ▶로 처음부터 다시 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await expect(page.getByRole('button', { name: '다시 재생' })).toHaveCount(0)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: NOH.start + 3, end: NOH.end, videoId: NOH.videoId })
    await page.getByRole('button', { name: '정지' }).click()
    await waitNotPlaying(page, 3_000)
    await expect(nowLabel(page)).toHaveText('멈춤')
    await expect(nowTitle(page)).toHaveText('노시환')
    await expect(page.locator('.now-time')).toHaveText('00:00 / 01:01')
    await expect(page.locator('.player-grid .is-playing')).toHaveCount(0)

    await page.getByRole('button', { name: '다시 재생' }).click()
    const again = await waitPlayingIn(page, { start: NOH.start, end: NOH.start + 3, videoId: NOH.videoId })
    note(testInfo, '다시 재생 첫 위치', again.time.toFixed(2))
    await expect(nowLabel(page)).toHaveText('지금 재생')
    await expect(page.getByRole('button', { name: '정지' })).toBeEnabled()
  })

  test('TC-112 끝까지 들은 뒤 ▶ [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    // 끝까지 기다리는 시간을 줄이려고 노시환 구간을 4초로 줄인 목록을 쓴다
    const short = { ...NOH, end: NOH.start + 4, cheerStart: null }
    await presetSongs(
      page,
      seedSongs().map((s) => (s.id === NOH.id ? short : s)),
    )
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await playerButton(page, '노시환').click()
    await waitPlayingIn(page, { start: short.start, end: short.end, videoId: NOH.videoId })
    await expect(nowLabel(page)).toHaveText('멈춤', { timeout: 15_000 })
    const ended = await ytSnapshot(page)
    note(testInfo, '끝난 뒤 상태', ended)
    expect(ended?.state === ENDED || (ended?.time ?? 0) >= short.end - 1).toBe(true)
    await expect(nowTitle(page)).toHaveText('노시환')
    await page.getByRole('button', { name: '다시 재생' }).click()
    const again = await waitPlayingIn(page, { start: short.start, end: short.start + 3, videoId: NOH.videoId })
    note(testInfo, '다시 재생 첫 위치', again.time.toFixed(2))
  })

  test('TC-113 새로고침 뒤에도 멈춘 채 남고, 그 곡을 지우면 사라진다', async ({ page }) => {
    // 노시환을 마지막으로 누른 기록이 있는 브라우저를 새로 연다
    await presetStorage(page, HISTORY_KEY, JSON.stringify({ version: 1, counts: { [NOH.id]: 1 }, recent: [NOH.id] }))
    await gotoHanwha(page)
    await expect(page.locator('.player-grid button').first()).toBeVisible()
    await expect(nowLabel(page)).toHaveText('멈춤')
    await expect(nowTitle(page)).toHaveText('노시환')
    await expect(page.getByRole('button', { name: '다시 재생' })).toBeEnabled()
    expect((await ytSnapshot(page))?.state ?? -1).not.toBe(1)

    await navLink(page, '곡 관리').click()
    page.once('dialog', (d) => void d.accept())
    await songRow(page, '노시환').locator('.song-item-main').click()
    await page.getByRole('button', { name: '곡 삭제' }).click()
    await navLink(page, '응원').click()
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
    await expect(nowLabel(page)).toHaveText('대기 중')
    await expect(page.getByRole('button', { name: '다시 재생' })).toHaveCount(0)
    await page.reload()
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
  })
})

test.describe('18. 팀 순서 바꾸기 [STEP 3-⑳]', () => {
  test('TC-114 마우스로 끌어 옮기고 새로고침해도 남는다. 짧게 누르면 팀을 고른다', async ({ page }) => {
    await gotoHanwha(page)
    await teamTrigger(page).click()
    await expect(teamSheet(page)).toBeVisible()
    expect(await sheetOrder(page)).toEqual(DEFAULT_ORDER)
    const from = await center(teamSheet(page).locator('[data-team-id="hanwha"]'))
    const to = await center(teamSheet(page).locator('[data-team-id="kt"]'))
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 12 })
    await page.mouse.up()
    const moved = ['키움', '롯데', 'SSG', '두산', 'NC', 'KIA', 'LG', '삼성', 'KT', '한화']
    expect(await sheetOrder(page)).toEqual(moved)
    await expect(teamSheet(page), '끌기는 팀 고르기가 아니다').toBeVisible()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    expect(await storedOrder(page)).toEqual(['kiwoom', 'lotte', 'ssg', 'doosan', 'nc', 'kia', 'lg', 'samsung', 'kt', 'hanwha'])

    await page.reload()
    await teamTrigger(page).click()
    expect(await sheetOrder(page)).toEqual(moved)
    await teamSheet(page).getByRole('button', { name: '삼성', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
  })

  test.describe('터치', () => {
    test.use({ hasTouch: true, viewport: { width: 360, height: 640 } })

    test('TC-115 길게 눌러 끌면 옮기고, 짧게 누르면 팀을 고른다', async ({ page }, testInfo) => {
      await gotoHanwha(page)
      await teamTrigger(page).click()
      await expect(teamSheet(page)).toBeVisible()
      const cdp = await page.context().newCDPSession(page)
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] })

      // 바로 미끄러지면 끌기가 아니다(순서 그대로, 팀도 그대로)
      const kia = await center(teamSheet(page).locator('[data-team-id="kia"]'))
      const lg = await center(teamSheet(page).locator('[data-team-id="lg"]'))
      await touch('touchStart', kia)
      await touch('touchMove', { x: kia.x + 20, y: kia.y })
      await touch('touchMove', lg)
      await touch('touchEnd')
      expect(await sheetOrder(page)).toEqual(DEFAULT_ORDER)
      await expect(teamSheet(page)).toBeVisible()

      // 길게 누른 뒤 끌면 옮긴다
      const from = await center(teamSheet(page).locator('[data-team-id="kt"]'))
      const to = await center(teamSheet(page).locator('[data-team-id="kiwoom"]'))
      await touch('touchStart', from)
      await page.waitForTimeout(500)
      await expect(teamSheet(page).locator('.team-cell.is-dragging')).toHaveAttribute('data-team-id', 'kt')
      for (let i = 1; i <= 8; i++) {
        await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 })
      }
      await touch('touchEnd')
      const moved = await sheetOrder(page)
      note(testInfo, '터치로 옮긴 순서', moved)
      expect(moved).toEqual(['KT', '키움', '한화', '롯데', 'SSG', '두산', 'NC', 'KIA', 'LG', '삼성'])
      await expect(teamSheet(page)).toBeVisible()
      await expect(page).toHaveURL(/\/team\/hanwha$/)

      // 짧게 누르면 그 팀으로 바뀐다
      const lgNow = await center(teamSheet(page).locator('[data-team-id="lg"]'))
      await page.touchscreen.tap(lgNow.x, lgNow.y)
      await expect(page).toHaveURL(/\/team\/lg$/)
      await page.reload()
      await teamTrigger(page).click()
      expect(await sheetOrder(page)).toEqual(moved)
    })
  })

  test('TC-116 키보드 Alt+방향키로 옮긴다', async ({ page }) => {
    await gotoHanwha(page)
    await teamTrigger(page).click()
    const kiwoom = teamSheet(page).locator('[data-team-id="kiwoom"]')
    await kiwoom.focus()
    await page.keyboard.press('Alt+ArrowRight')
    expect((await sheetOrder(page)).slice(0, 3)).toEqual(['한화', '키움', '롯데'])
    await expect(kiwoom).toBeFocused()
    await page.keyboard.press('Alt+ArrowDown')
    expect(await sheetOrder(page)).toEqual(['한화', '롯데', 'SSG', '두산', 'NC', 'KIA', '키움', 'LG', '삼성', 'KT'])
    await expect(kiwoom).toBeFocused()
    await expect(teamSheet(page).locator('[aria-live="polite"]')).toHaveText('키움을(를) 7번째로 옮겼습니다')
    // Alt 없는 방향키·Enter는 지금처럼 동작한다(Enter는 그 팀을 고른다)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/team\/kiwoom$/)
  })

  test('TC-117 백업·초기화의 「팀 순서 처음으로」', async ({ page }) => {
    await gotoHanwha(page)
    await teamTrigger(page).click()
    await teamSheet(page).locator('[data-team-id="kiwoom"]').focus()
    await page.keyboard.press('Alt+ArrowRight')
    await page.keyboard.press('Escape')
    await expect(teamSheet(page)).toBeHidden()
    await page.goto('/team/hanwha/songs/data')
    const reset = page.getByRole('button', { name: '팀 순서 처음으로' })
    await expect(reset).toBeEnabled()
    await reset.click()
    await expect(reset).toBeDisabled()
    expect(await storedOrder(page)).toEqual(['kiwoom', 'hanwha', 'lotte', 'ssg', 'doosan', 'nc', 'kia', 'lg', 'samsung', 'kt'])
    await page.goto('/team/hanwha')
    await teamTrigger(page).click()
    expect(await sheetOrder(page)).toEqual(DEFAULT_ORDER)
  })
})
