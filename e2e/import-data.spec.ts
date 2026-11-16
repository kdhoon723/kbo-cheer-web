//20241476-김도훈-(2026-11-16)
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  HISTORY_KEY,
  apiKeyMissing,
  expectPlayerReady,
  note,
  nowLabel,
  nowTitle,
  presetSongs,
  seedSong,
  seedSongs,
  songRow,
  storedSongs,
  toast,
  waitNotPlaying,
  waitPlayingIn,
} from './helpers.ts'

const DOOSAN_URL = 'https://www.youtube.com/watch?v=jHxEtjKhJvA'
const HANWHA_URL = 'https://www.youtube.com/watch?v=0OUzosfuD0s'
const DROPPED = ['노시환', '페라자', '행복송', '라인업송']

async function loadReview(page: Page, teamId: string, url: string) {
  await page.goto(`/team/${teamId}/songs/add`)
  test.skip(await apiKeyMissing(page), 'API 키가 없어 가져오기 화면이 비활성')
  await page.getByRole('textbox', { name: 'YouTube 영상 주소' }).fill(url)
  await page.getByRole('button', { name: '불러오기' }).click()
  await expect(page.locator('.review-counts')).toBeVisible({ timeout: 15_000 })
}

function filter(page: Page, name: string) {
  return page.getByRole('group', { name: '후보 거르기' }).getByRole('button', { name: new RegExp(`^${name} \\d+$`) })
}

test.describe('21. 곡 추가와 백업·초기화 [STEP 3-㉔]', () => {
  test('TC-134 단계 표시와 이 팀 기본 모음 영상', async ({ page }) => {
    await page.goto('/team/doosan/songs/add')
    const steps = page.getByRole('list', { name: '곡 추가 단계' }).getByRole('listitem')
    await expect(steps).toHaveText(['1주소', '2확인', '3저장'])
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step')
    await expect(page.locator('.import-guide')).toContainText('챕터')
    await page.getByRole('button', { name: '이 팀 기본 모음 영상' }).click()
    await expect(page.getByRole('textbox', { name: 'YouTube 영상 주소' })).toHaveValue(DOOSAN_URL)
  })

  test('TC-135 전부 이미 있는 두산 모음 영상 [API]', async ({ page }, testInfo) => {
    await loadReview(page, 'doosan', DOOSAN_URL)
    await expect(page.locator('.review-counts')).toHaveText('새 곡 0 · 이미 있음 50 · 경고 1')
    await expect(page.locator('.import-page .status-message')).toContainText('새로 넣을 곡이 없습니다')
    await expect(page.getByRole('list', { name: '곡 추가 단계' }).getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step')
    // 경고가 있는 후보 하나만 처음부터 펼쳐져 있다
    await expect(page.locator('.candidate')).toHaveCount(51)
    await expect(page.locator('.candidate-edit')).toHaveCount(1)
    await expect(page.locator('.candidate.is-open')).toHaveClass(/candidate-warning/)
    await expect(page.getByRole('button', { name: '0곡 저장' })).toBeDisabled()

    await filter(page, '이미 있음').click()
    await expect(page.locator('.candidate')).toHaveCount(50)
    await filter(page, '새 곡').click()
    await expect(page.getByText('이 조건에 맞는 후보가 없습니다')).toBeVisible()
    await filter(page, '경고').click()
    await expect(page.locator('.candidate')).toHaveCount(1)
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    note(testInfo, '경고 필터 세로 길이', height)
  })

  test('TC-136 한화 곡 4개를 지운 뒤 새 곡만 골라 저장 [API]', async ({ page }) => {
    await presetSongs(
      page,
      seedSongs().filter((s) => !(s.teamId === 'hanwha' && DROPPED.includes(s.title))),
    )
    await loadReview(page, 'hanwha', HANWHA_URL)
    await expect(page.locator('.review-counts')).toHaveText(/^새 곡 4 · 이미 있음 \d+ · 경고 0$/)
    await expect(page.locator('.import-summary')).toHaveText('선수 2 · 상황 1 · 팀 응원가 1 / 저장 4곡')
    await filter(page, '새 곡').click()
    await expect(page.locator('.candidate-name')).toHaveText(['페라자', '노시환', '라인업송', '행복송'].sort((a, b) => order(a) - order(b)))
    await page.getByRole('button', { name: '전체 해제' }).click()
    await expect(page.getByRole('button', { name: '0곡 저장' })).toBeDisabled()
    await page.getByRole('button', { name: '전체 선택' }).click()
    // 줄을 누르면 그 후보만 펼쳐 고친다
    await page.locator('.candidate-toggle', { hasText: '행복송' }).click()
    await expect(page.locator('.candidate-edit')).toHaveCount(1)
    await expect(page.getByRole('textbox', { name: '이름' })).toHaveValue('행복송')
    await page.getByRole('button', { name: '4곡 저장' }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    await expect(toast(page)).toHaveText(/4곡을 저장했습니다/)
    const hanwha = (await storedSongs(page)).filter((s) => s.teamId === 'hanwha')
    expect(hanwha).toHaveLength(44)
    for (const title of DROPPED) expect(hanwha.some((s) => s.title === title), title).toBe(true)

    function order(title: string) {
      return seedSongs().find((s) => s.teamId === 'hanwha' && s.title === title)?.start ?? 0
    }
  })

  test('TC-137 백업 파일 미리 보기, 취소와 바꾸기, 마지막 내보낸 때', async ({ page }, testInfo) => {
    await page.goto('/team/hanwha/songs/data')
    await expect(page.locator('.data-note').first()).toHaveText('아직 내보낸 적이 없습니다')
    // 파일 칸은 숨겨져 있고 영어 기본 문구가 없다
    await expect(page.locator('input[type="file"]')).toBeHidden()
    expect(await page.evaluate(() => /Choose File|No file chosen/.test(document.body.innerText))).toBe(false)
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['백업', '초기화', '저장 위치'])

    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'JSON 내보내기' }).click()
    await downloading
    await expect(page.locator('.data-note').first()).toHaveText(/^마지막으로 내보낸 때 \d{4}-\d\d-\d\d \d\d:\d\d · 507곡$/)

    const seedFile = JSON.parse(readFileSync(new URL('../src/data/seed-songs.json', import.meta.url), 'utf8'))
    const two = { ...seedFile, songs: seedFile.songs.filter((s: { teamId: string }) => s.teamId === 'hanwha' || s.teamId === 'lg') }
    const path = testInfo.outputPath('hanwha-lg.json')
    writeFileSync(path, JSON.stringify(two))

    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'JSON 파일 고르기' }).click()
    await (await chooser).setFiles(path)
    const preview = page.getByRole('region', { name: '가져올 파일' })
    await expect(preview.locator('.file-preview-name')).toHaveText('hanwha-lg.json')
    await expect(preview).toContainText('88곡 · 지금 곡 목록 507곡을 이 파일의 곡으로 바꿉니다(합치지 않습니다)')
    await expect(preview.locator('.file-preview-teams li')).toHaveText(['한화 44', 'LG 44'])
    await preview.getByRole('button', { name: '취소' }).click()
    await expect(preview).toHaveCount(0)
    expect(await storedSongs(page)).toHaveLength(507)

    const again = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'JSON 파일 고르기' }).click()
    await (await again).setFiles(path)
    await page.getByRole('button', { name: '이 파일로 바꾸기' }).click()
    await expect(toast(page)).toHaveText(/88곡을 가져왔습니다/)
    await expect(page.getByText('현재 곡 88곡')).toBeVisible()
    expect(await storedSongs(page)).toHaveLength(88)
  })

  test('TC-139 곡 관리의 미리 듣기는 튼 기록·최근 곡·마지막 곡에 들어가지 않는다 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const noh = seedSong('hanwha', '노시환')
    const history = () => page.evaluate((key) => localStorage.getItem(key), HISTORY_KEY)
    await page.goto('/team/hanwha/songs')
    await expectPlayerReady(page)
    const before = await history()
    await songRow(page, '노시환').getByRole('button', { name: '미리 듣기: 노시환' }).click()
    await waitPlayingIn(page, { start: noh.start, end: noh.end, videoId: noh.videoId })
    await songRow(page, '노시환').getByRole('button', { name: '정지: 노시환' }).click()
    await waitNotPlaying(page, 3_000)

    await songRow(page, '노시환').locator('.song-item-main').click()
    await page.getByRole('button', { name: '처음부터' }).click()
    await waitPlayingIn(page, { start: noh.start, end: noh.end, videoId: noh.videoId })
    await page.getByRole('button', { name: '정지', exact: true }).click()
    await waitNotPlaying(page, 3_000)

    const after = await history()
    note(testInfo, '미리 듣기 전후 기록', { before, after })
    expect(after).toBe(before)
    // 마지막 곡(최근 곡 맨 앞)도 생기지 않아 재생 줄은 비어 있다
    await expect(nowLabel(page)).toHaveText('대기 중')
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
  })
})
