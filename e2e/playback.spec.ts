//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  ENDED,
  PAUSED,
  PLAYING,
  expectPlayerReady,
  gotoHanwha,
  navLink,
  note,
  nowTitle,
  playerButton,
  presetSongs,
  seedSong,
  seedSongs,
  situationButton,
  storedSongs,
  teamPicker,
  toast,
  waitNotPlaying,
  waitPlayingIn,
  ytSnapshot,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
const HANWHA_VIDEO = NOH.videoId

async function playAndWait(page: Page, title: string) {
  const song = seedSong('hanwha', title)
  await playerButton(page, title).click()
  return waitPlayingIn(page, { start: song.start, end: song.end, videoId: song.videoId })
}

test.describe('4. 재생', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHanwha(page)
    await expectPlayerReady(page)
  })

  test('TC-13 선수 곡 재생', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const first = await playAndWait(page, '노시환')
    note(testInfo, '첫 재생 위치(초)', first.time.toFixed(2))
    note(testInfo, '버튼부터 재생까지(ms)', first.waitedMs)
    expect(first.time).toBeGreaterThanOrEqual(414)
    expect(first.time).toBeLessThan(417)
    await expect(nowTitle(page)).toHaveText('노시환 · 한화')
    await expect(page.locator('.player-panel .now-time')).toHaveText(/^00:0[1-9] \/ 01:01$/, { timeout: 10_000 })
    note(testInfo, '진행 시각 표시', await page.locator('.player-panel .now-time').innerText())
  })

  test('TC-14 끝 시각 정지', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    const song = seedSong('hanwha', '공통 안타 송')
    await situationButton(page, '공통 안타 송').click()
    await waitPlayingIn(page, { start: song.start, end: song.end, videoId: song.videoId })
    let maxTime = 0
    let stopped = null
    const began = Date.now()
    while (Date.now() - began < 40_000) {
      const s = await ytSnapshot(page)
      if (s && s.state === PLAYING) maxTime = Math.max(maxTime, s.time)
      if (s && s.state !== PLAYING && s.state !== 3 && maxTime > 0) {
        stopped = s
        break
      }
      await page.waitForTimeout(50)
    }
    note(testInfo, '재생 중 본 가장 큰 위치(초)', maxTime.toFixed(3))
    note(testInfo, '멈춘 뒤 상태', stopped)
    expect(stopped, '40초 안에 멈춰야 함').not.toBeNull()
    expect(maxTime).toBeLessThan(song.end + 1)
    expect(stopped?.time ?? Infinity).toBeLessThan(song.end + 1)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
    await page.waitForTimeout(3_000)
    const after = await ytSnapshot(page)
    note(testInfo, '3초 뒤 상태', after)
    expect(after?.state).not.toBe(PLAYING)
    expect(after?.time ?? Infinity).toBeLessThan(song.end + 1)
  })

  test('TC-15 같은 영상 연속 전환', async ({ page }, testInfo) => {
    test.setTimeout(240_000)
    const order = ['황영묵', '최인호', '박정현', '페라자', '오재원', '문현빈', '박상언', '강백호', '이원석', '노시환']
    const results: { title: string; start: number; firstTime: number; waitedMs: number; laterTime: number }[] = []
    for (const title of order) {
      const song = seedSong('hanwha', title)
      const first = await playAndWait(page, title)
      await page.waitForTimeout(1_500)
      const later = await ytSnapshot(page)
      results.push({
        title,
        start: song.start,
        firstTime: Number(first.time.toFixed(2)),
        waitedMs: first.waitedMs,
        laterTime: Number((later?.time ?? -1).toFixed(2)),
      })
      expect(first.time - song.start, `${title} 시작 위치`).toBeLessThan(2.5)
      expect(later?.state, `${title} 1.5초 뒤 재생 중`).toBe(PLAYING)
      expect(later?.time ?? Infinity, `${title} 끝 시각 안`).toBeLessThan(song.end)
      expect(later?.time ?? -1, `${title} 시작 시각 뒤`).toBeGreaterThanOrEqual(song.start)
    }
    note(testInfo, '전환 결과', results)
    const waits = results.map((r) => r.waitedMs).sort((a, b) => a - b)
    note(testInfo, '응답(ms) 중앙값·최댓값', { median: (waits[4] + waits[5]) / 2, max: waits[9] })
  })

  test('TC-16 다른 영상 전환', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await playAndWait(page, '노시환')
    const diaz = seedSong('samsung', '디아즈')
    await page.locator('.search-box').fill('디아즈')
    await page.locator('.result-list button').filter({ hasText: '디아즈' }).first().click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
    const s = await waitPlayingIn(page, { start: diaz.start, end: diaz.end, videoId: diaz.videoId })
    note(testInfo, '삼성 영상 첫 재생 위치', { videoId: s.videoId, time: s.time.toFixed(2) })
    expect(s.videoId).not.toBe(HANWHA_VIDEO)
    expect(s.time - diaz.start).toBeLessThan(2.5)
  })

  test('TC-17 같은 버튼 다시 누르기', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await playAndWait(page, '노시환')
    await waitPlayingIn(page, { start: 418, end: NOH.end })
    const before = await ytSnapshot(page)
    await playerButton(page, '노시환').click()
    await expect.poll(async () => (await ytSnapshot(page))?.time ?? 0, { timeout: 5_000 }).toBeLessThan(417)
    const again = await waitPlayingIn(page, { start: 414, end: 417 })
    note(testInfo, '다시 누르기 전·후 위치', { before: before?.time.toFixed(2), after: again.time.toFixed(2) })
  })

  test('TC-18 응원가 시작 지정·건너뛰기', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await playAndWait(page, '노시환')
    await waitPlayingIn(page, { start: 418, end: NOH.end })
    await page.getByRole('button', { name: '지금 → 응원가 시작' }).click()
    const saved = (await storedSongs(page)).find((s) => s.id === NOH.id)
    const cheerStart = saved?.cheerStart ?? null
    note(testInfo, '저장된 cheerStart', cheerStart)
    expect(cheerStart).not.toBeNull()
    expect(cheerStart ?? 0).toBeGreaterThan(414)
    expect(cheerStart ?? 0).toBeLessThan(475)
    await expect(page.locator('button.skip-btn')).toBeEnabled()

    await page.reload()
    await expectPlayerReady(page)
    expect((await storedSongs(page)).find((s) => s.id === NOH.id)?.cheerStart).toBe(cheerStart)
    await playAndWait(page, '노시환')
    await expect(page.locator('button.skip-btn')).toBeEnabled()
    await page.locator('button.skip-btn').click()
    const jumped = await waitPlayingIn(page, { start: cheerStart ?? 0, end: (cheerStart ?? 0) + 3 })
    note(testInfo, '「응원가로」 뒤 위치', jumped.time.toFixed(2))
  })

  test('TC-19 응원가 시작 없는 곡', async ({ page }) => {
    test.setTimeout(90_000)
    const song = seedSong('hanwha', '라인업송')
    await situationButton(page, '라인업송').click()
    await waitPlayingIn(page, { start: song.start, end: song.end })
    await expect(nowTitle(page)).toHaveText('라인업송 · 한화')
    await expect(page.locator('button.skip-btn')).toBeDisabled()
    await expect(page.getByRole('button', { name: '지금 → 응원가 시작' })).toBeDisabled()
    await page.waitForTimeout(2_000)
    await expect(page.locator('button.skip-btn')).toBeDisabled()
    await expect(page.getByRole('button', { name: '지금 → 응원가 시작' })).toBeDisabled()
  })

  test('TC-20 정지 페이드', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await playAndWait(page, '노시환')
    await page.waitForTimeout(1_000)
    const startVolume = (await ytSnapshot(page))?.volume
    note(testInfo, '정지 전 볼륨', startVolume)

    const sampling = page.evaluate(
      () =>
        new Promise<{ clickAt: number; samples: { at: number; volume: number; state: number }[] }>((resolve) => {
          const samples: { at: number; volume: number; state: number }[] = []
          let clickAt = -1
          document.addEventListener('click', () => (clickAt = performance.now()), { capture: true, once: true })
          const began = performance.now()
          const id = setInterval(() => {
            const p = window.YT?.get?.('yt-player')
            if (p) samples.push({ at: performance.now(), volume: p.getVolume(), state: p.getPlayerState() })
            if (performance.now() - began > 3_000) {
              clearInterval(id)
              resolve({ clickAt, samples })
            }
          }, 50)
        }),
    )
    await page.waitForTimeout(200)
    await page.locator('button.stop-btn').click()
    const { clickAt, samples } = await sampling
    const after = samples.filter((s) => s.at >= clickAt)
    const minVolumeWhilePlaying = Math.min(...after.filter((s) => s.state === PLAYING).map((s) => s.volume))
    const pausedAt = after.find((s) => s.state === PAUSED || s.state === ENDED)?.at ?? null
    const fadeMs = pausedAt === null ? null : Math.round(pausedAt - clickAt)
    note(testInfo, '페이드 중 가장 낮은 볼륨(재생 중)', minVolumeWhilePlaying)
    note(testInfo, '정지 누름부터 멈춤까지(ms)', fadeMs)
    expect(clickAt).toBeGreaterThan(0)
    expect(minVolumeWhilePlaying).toBeLessThan(startVolume ?? 100)
    expect(fadeMs).not.toBeNull()
    expect(fadeMs ?? 0).toBeGreaterThanOrEqual(700)
    expect(fadeMs ?? Infinity).toBeLessThanOrEqual(1_600)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
    await expect.poll(async () => (await ytSnapshot(page))?.volume).toBe(startVolume)
    note(testInfo, '멈춘 뒤 볼륨', (await ytSnapshot(page))?.volume)

    await playAndWait(page, '노시환')
    await page.locator('button.stop-btn').click()
    await page.waitForTimeout(150)
    await expect(page.locator('.player-panel .now-label')).toHaveText('멈추는 중')
    const second = Date.now()
    await page.locator('button.stop-btn').click()
    const stopped = await waitNotPlaying(page, 2_000)
    const secondMs = Date.now() - second
    note(testInfo, '두 번째 누름부터 멈춤까지(ms, 폴링 포함)', secondMs)
    expect(stopped.state).not.toBe(PLAYING)
    expect(secondMs).toBeLessThan(700)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
    await expect.poll(async () => (await ytSnapshot(page))?.volume).toBe(startVolume)
  })

  test('TC-21 볼륨', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const slider = page.locator('.player-panel input[type="range"]')
    await slider.fill('40')
    await expect(page.locator('.volume-value')).toHaveText('40')
    await page.reload()
    await expectPlayerReady(page)
    await expect(slider).toHaveValue('40')
    await expect(page.locator('.volume-value')).toHaveText('40')
    await playAndWait(page, '노시환')
    await expect.poll(async () => (await ytSnapshot(page))?.volume).toBe(40)
    note(testInfo, '재생 중 플레이어 볼륨', (await ytSnapshot(page))?.volume)
  })

  test('TC-22 화면 이동 중 재생 유지', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await playAndWait(page, '노시환')
    const seen: number[] = []
    for (const step of ['곡 관리', '설정', 'KT'] as const) {
      if (step === 'KT') {
        await teamPicker(page).selectOption('kt')
        await expect(page).toHaveURL(/\/team\/kt$/)
      } else {
        await navLink(page, step).click()
        await expect(page).toHaveURL(step === '설정' ? /\/settings$/ : /\/team\/hanwha\/songs$/)
      }
      await page.waitForTimeout(1_000)
      const s = await ytSnapshot(page)
      seen.push(Number((s?.time ?? -1).toFixed(2)))
      expect(s?.state, `${step} 화면에서 재생 중`).toBe(PLAYING)
      await expect(page.locator('iframe')).toHaveCount(1)
      await expect(nowTitle(page)).toHaveText('노시환 · 한화')
    }
    note(testInfo, '화면마다 재생 위치', seen)
    expect(seen[1]).toBeGreaterThan(seen[0])
    expect(seen[2]).toBeGreaterThan(seen[1])
  })

  test('TC-24 플레이어 표시', async ({ page }, testInfo) => {
    for (const size of [
      { width: 360, height: 640 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(size)
      await page.waitForTimeout(300)
      const box = await page.locator('.player-host iframe').boundingBox()
      note(testInfo, `${size.width}×${size.height} 플레이어 크기`, box)
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(200)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(200)
      const covered = await page.locator('.player-host iframe').evaluate((iframe) => {
        const r = iframe.getBoundingClientRect()
        // 노트북 화면의 플레이어는 모서리가 둥글게 잘려 있어 모서리에서 안쪽으로 들어간 점을 본다
        const inset = 16
        const points = [
          [r.left + inset, r.top + inset],
          [r.right - inset, r.top + inset],
          [r.left + inset, r.bottom - inset],
          [r.right - inset, r.bottom - inset],
          [r.left + r.width / 2, r.top + r.height / 2],
        ]
        return points
          .filter(([x, y]) => document.elementFromPoint(x, y) !== iframe)
          .map(([x, y]) => ({ x, y, hit: document.elementFromPoint(x, y)?.outerHTML.slice(0, 80) ?? null }))
      })
      expect(covered, `${size.width}px에서 플레이어를 가리는 요소`).toEqual([])
    }
  })
})

test.describe('4. 재생 오류', () => {
  test('TC-23 재생 오류', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const songs = seedSongs()
    songs.push({
      id: 'e2e-bad-video',
      teamId: 'hanwha',
      kind: 'player',
      title: '오류 시험곡',
      videoId: 'xxxxxxxxxxx',
      videoDuration: 3201,
      start: 0,
      end: 30,
      cheerStart: null,
      order: 99,
    })
    await presetSongs(page, songs)
    await gotoHanwha(page)
    await expectPlayerReady(page)
    expect((await storedSongs(page)).some((s) => s.id === 'e2e-bad-video')).toBe(true)
    await playerButton(page, '오류 시험곡').click()
    await expect(toast(page)).toBeVisible({ timeout: 15_000 })
    const message = await toast(page).locator('.toast-text').innerText()
    note(testInfo, '오류 안내', message)
    expect(message).toMatch(/재생할 수 없습니다|재생 정보를 확인하지 못했습니다/)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
    await expect(page.locator('button.stop-btn')).toBeDisabled()
    const s = await waitPlayingInNoh(page)
    note(testInfo, '다음 곡 재생 위치', s.time.toFixed(2))
  })
})

async function waitPlayingInNoh(page: Page) {
  await playerButton(page, '노시환').click()
  return waitPlayingIn(page, { start: NOH.start, end: NOH.end, videoId: NOH.videoId })
}
