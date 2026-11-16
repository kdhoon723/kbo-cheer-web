//20241476-김도훈-(2026-11-15)
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  formField,
  openSongData,
  note,
  openEdit,
  parseSongList,
  seedSongs,
  songRow,
  storedSongs,
  expectCurrentTeam,
  toast,
} from './helpers.ts'

async function renameNoh(page: Page): Promise<void> {
  await openEdit(page, 'hanwha', '노시환')
  await formField(page, '이름').fill('노시환(수정)')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(songRow(page, '노시환(수정)')).toHaveCount(1)
}

function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

async function exportJson(page: Page, savePath: string): Promise<{ name: string; text: string }> {
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON 내보내기' }).click()
  const download = await downloading
  await download.saveAs(savePath)
  return { name: download.suggestedFilename(), text: readFileSync(savePath, 'utf8') }
}

test.describe('7. JSON과 처음 데이터', () => {
  test('TC-44 처음 데이터', async ({ page }, testInfo) => {
    await page.goto('/team/hanwha/songs/data')
    await expect(page.getByText('현재 곡 507곡')).toBeVisible()
    const songs = await storedSongs(page)
    const players = songs.filter((s) => s.kind === 'player').length
    note(testInfo, '곡 수·선수 곡 수', { songs: songs.length, players })
    expect(songs).toHaveLength(507)
    expect(players).toBe(235)
    await page.goto('/team/doosan/songs?tab=team')
    await expect(songRow(page, '서울 두산 승리하리라').locator('.song-item-meta')).toHaveText(/^40:36–42:05 · /)
  })

  test('TC-45 JSON 내보내기', async ({ page }, testInfo) => {
    await renameNoh(page)
    await openSongData(page)
    const { name, text } = await exportJson(page, testInfo.outputPath('export.json'))
    note(testInfo, '파일 이름', name)
    expect(name).toBe(`kbo-cheer-songs-${todayStamp()}.json`)
    const data: unknown = JSON.parse(text)
    expect(data).toMatchObject({ format: 'kbo-cheer-songs', version: 1, exportedAt: expect.any(String) })
    const songs = parseSongList(data)
    expect(songs).toHaveLength(507)
    expect(songs.some((s) => s.title === '노시환(수정)')).toBe(true)
    expect(text).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/)
    expect(text).not.toContain('VITE_YOUTUBE_API_KEY')
    await expect(toast(page)).toHaveText(/507곡을 내보냈습니다/)
  })

  test('TC-46 처음 데이터로 되돌리기', async ({ page }) => {
    await renameNoh(page)
    await openSongData(page)
    page.once('dialog', (d) => void d.dismiss())
    await page.getByRole('button', { name: '처음 데이터로 되돌리기' }).click()
    expect((await storedSongs(page)).some((s) => s.title === '노시환(수정)')).toBe(true)

    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: '처음 데이터로 되돌리기' }).click()
    await expect(toast(page)).toHaveText(/처음 데이터\(507곡\)로 되돌렸습니다/)
    const songs = await storedSongs(page)
    expect(songs).toEqual(seedSongs())
    await expectCurrentTeam(page, 'hanwha')
    const team: unknown = await page.evaluate(() => JSON.parse(localStorage.getItem('kboCheer.team') ?? 'null'))
    expect(team).toMatchObject({ currentTeamId: 'hanwha' })
  })

  test('TC-47 JSON 가져오기 왕복', async ({ page }, testInfo) => {
    await renameNoh(page)
    await openSongData(page)
    const filePath = testInfo.outputPath('export.json')
    const { text } = await exportJson(page, filePath)
    const exported = parseSongList(JSON.parse(text))

    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: '처음 데이터로 되돌리기' }).click()
    expect((await storedSongs(page)).some((s) => s.title === '노시환(수정)')).toBe(false)

    const messages: string[] = []
    page.once('dialog', (d) => {
      messages.push(d.message())
      void d.accept()
    })
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(toast(page)).toHaveText(/507곡을 가져왔습니다/)
    expect(messages).toEqual(['지금 곡 목록 507곡을 파일의 507곡으로 바꿉니다'])
    expect(await storedSongs(page)).toEqual(exported)
  })

  test('TC-48 잘못된 JSON 파일', async ({ page }, testInfo) => {
    await page.goto('/team/hanwha/songs/data')
    const before = await storedSongs(page)
    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      void d.dismiss()
    })
    const cases = [
      { name: 'not-json.json', body: 'not json', notice: '올바른 곡 목록 파일이 아닙니다' },
      {
        name: 'other-format.json',
        body: JSON.stringify({ format: 'something-else', version: 1, songs: before }),
        notice: '올바른 곡 목록 파일이 아닙니다',
      },
      {
        name: 'empty.json',
        body: JSON.stringify({ format: 'kbo-cheer-songs', version: 1, exportedAt: new Date().toISOString(), songs: [] }),
        notice: '파일에 곡이 없습니다',
      },
    ]
    for (const c of cases) {
      const path = testInfo.outputPath(c.name)
      writeFileSync(path, c.body)
      if (await toast(page).isVisible()) await toast(page).click()
      await expect(toast(page)).toBeHidden()
      await page.locator('input[type="file"]').setInputFiles(path)
      await expect(toast(page), c.name).toHaveText(new RegExp(c.notice))
      await expect(page.getByText('현재 곡 507곡')).toBeVisible()
      expect(await storedSongs(page)).toEqual(before)
    }
    expect(dialogs).toEqual([])
  })
})

test.describe('7-1. 곡 관리 안의 백업·초기화 [STEP 3-⑱]', () => {
  test('TC-102 예전 설정 주소와 메뉴', async ({ page }) => {
    // 팀을 고른 적이 없으면 팀 선택 화면으로 간다
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/team/hanwha')
    const nav = page.getByRole('navigation', { name: '화면' })
    await expect(nav.getByRole('link')).toHaveText(['응원', '곡 관리'])
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/team\/hanwha\/songs\/data$/)
    await expect(page.getByRole('heading', { name: '백업·초기화' })).toBeVisible()
    await expect(page.getByText('현재 곡 507곡(10개 구단 전체)')).toBeVisible()
    await page.getByRole('link', { name: '곡 관리', exact: true }).last().click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    await page.setViewportSize({ width: 360, height: 640 })
    await expect(nav.getByRole('link')).toHaveText(['응원'])
  })
})
