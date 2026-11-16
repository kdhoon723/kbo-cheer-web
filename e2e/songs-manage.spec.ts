//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import {
  expectPlayerReady,
  formField,
  formFieldLabel,
  note,
  openEdit,
  playerButton,
  seedSong,
  songRow,
  storedSongs,
  waitPlayingIn,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
const JANG = seedSong('samsung', '장승현')

test.describe('20. 곡 목록·곡 수정 [STEP 3-㉓]', () => {
  test('TC-127 탭·검색·필터는 주소에 남고, 수정 화면에서 돌아오면 그 곡 줄로 온다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/team/hanwha/songs')
    const tabs = page.getByRole('tablist', { name: '곡 종류' }).getByRole('tab')
    await expect(tabs).toHaveText(['선수 22', '상황 4', '팀 응원가 18'])
    await expect(page.locator('.song-item')).toHaveCount(22)
    // 목록에는 줄마다 미리 듣기 버튼 하나만 있고 수정·삭제 버튼이 없다
    await expect(page.locator('.song-item button')).toHaveCount(22)
    await expect(page.getByRole('button', { name: '삭제', exact: true })).toHaveCount(0)
    await expect(songRow(page, '노시환').locator('.song-item-meta')).toHaveText('06:54–07:55 · 1:01 · 응원가 07:25')
    await expect(songRow(page, '노시환').locator('.song-item-pos')).toHaveText('3루수')

    await page.getByRole('tab', { name: /^팀 응원가/ }).click()
    await expect(page).toHaveURL(/\?tab=team$/)
    await expect(page.locator('.song-item')).toHaveCount(18)
    const search = page.getByRole('searchbox', { name: '이 팀 곡 검색' })
    await search.fill('이글스')
    await expect(page.locator('.song-item')).not.toHaveCount(18)
    const titles = await page.locator('.song-item-title').allTextContents()
    expect(titles.length).toBeGreaterThan(1)
    expect(titles.every((t) => t.includes('이글스'))).toBe(true)
    await expect(page).toHaveURL(/\?tab=team&q=/)
    await search.fill('ㅎㅂㅅ')
    await expect(page.locator('.song-item-title')).toHaveText(['행복송'])

    await page.getByRole('tab', { name: /^선수/ }).click()
    await search.fill('')
    const filter = page.getByRole('button', { name: /응원가 시작 없는 곡/ })
    await expect(filter).toHaveText(/12$/)
    await filter.click()
    await expect(filter).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.song-item')).toHaveCount(12)
    await expect(page.locator('.song-item-meta')).toHaveText(Array(12).fill(/응원가 시작 없음$/))

    const target = page.locator('.song-item').last()
    const title = (await target.locator('.song-item-title').textContent()) ?? ''
    await target.locator('.song-item-main').click()
    await expect(page).toHaveURL(/\/edit\?missing=1$/)
    await page.getByRole('link', { name: '곡 목록' }).click()
    await expect(page).toHaveURL(/\/songs\?missing=1$/)
    await expect(page.locator('.song-item')).toHaveCount(12)
    await expect(songRow(page, title).locator('.song-item-main')).toBeFocused()
    await expect(songRow(page, title)).toBeInViewport()
  })

  test('TC-128 저장하지 않고 나가면 확인하고, 바뀐 것이 없으면 저장이 비활성', async ({ page }) => {
    await openEdit(page, 'hanwha', '노시환')
    const save = page.getByRole('button', { name: '저장', exact: true })
    await expect(save).toBeDisabled()
    await formField(page, '이름').fill('노시환!')
    await expect(save).toBeEnabled()

    // 확인 창 응답: 처음은 취소(남기), 다음은 확인(나가기)
    const messages: string[] = []
    const answers = [false, true]
    page.on('dialog', (d) => {
      messages.push(d.message())
      void (answers.shift() ? d.accept() : d.dismiss())
    })
    await page.getByRole('link', { name: '응원', exact: true }).click()
    await expect(page).toHaveURL(/\/edit$/)
    await expect(formField(page, '이름')).toHaveValue('노시환!')

    await page.getByRole('button', { name: '취소', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    expect(messages).toEqual(Array(2).fill('저장하지 않은 변경이 있습니다. 저장하지 않고 나갈까요?'))
    expect((await storedSongs(page)).find((s) => s.id === NOH.id)?.title).toBe('노시환')
    // 수정 칸이 닫히고 새로고침·창 닫기 경고(beforeunload)가 풀린 뒤에 다른 주소로 간다
    await expect(page.locator('.songs-detail-empty')).toBeVisible()

    // 원래 값으로 되돌리면 바뀐 것이 없어 묻지 않고 나간다
    await openEdit(page, 'hanwha', '노시환')
    await formField(page, '이름').fill('노시환!')
    await formField(page, '이름').fill('노시환')
    await expect(save).toBeDisabled()
    await page.getByRole('button', { name: '취소', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
  })

  test('TC-129 잘못된 값은 칸 아래에 바로 알리고, ±1초로 시각을 고친다', async ({ page }) => {
    await openEdit(page, 'hanwha', '노시환')
    await formField(page, '끝').fill('06:00')
    await formField(page, '이름').focus()
    await expect(formFieldLabel(page, '끝').locator('.form-error')).toHaveText('끝 시각은 시작 시각보다 뒤여야 합니다')
    await formField(page, '끝').fill('07:55')
    await expect(formFieldLabel(page, '끝').locator('.form-error')).toHaveCount(0)

    await formField(page, '응원가 시작').fill('08:30')
    await formField(page, '이름').focus()
    await expect(formFieldLabel(page, '응원가 시작').locator('.form-error')).toHaveText('응원가 시작은 시작과 끝 사이여야 합니다')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/edit$/)

    await formField(page, '끝').fill('99:00')
    await formField(page, '이름').focus()
    await expect(formFieldLabel(page, '끝').locator('.form-error')).toHaveText('끝 시각은 영상 길이(53:21) 이하여야 합니다')
    await formField(page, '끝').fill('07:55')

    await formField(page, '응원가 시작').fill('07:25')
    await page.getByRole('button', { name: '응원가 시작 1초 뒤로' }).click()
    await page.getByRole('button', { name: '응원가 시작 1초 뒤로' }).click()
    await page.getByRole('button', { name: '시작 1초 앞으로', exact: true }).click()
    await expect(formField(page, '응원가 시작')).toHaveValue('07:27')
    await expect(formField(page, '시작')).toHaveValue('06:53')
    // 미리 듣는 중이 아니면 「지금 위치로」는 누를 수 없다
    await expect(page.getByRole('button', { name: '응원가 시작을 지금 위치로' })).toBeDisabled()
    await page.getByRole('button', { name: '저장', exact: true }).click()
    expect((await storedSongs(page)).find((s) => s.id === NOH.id)).toMatchObject({ start: 413, cheerStart: 447 })
  })

  test('TC-130 삭제는 수정 화면에 있고, 지운 뒤 같은 탭으로 돌아간다', async ({ page }) => {
    await openEdit(page, 'hanwha', '라인업송', 'situation')
    await expect(page).toHaveURL(/\/edit\?tab=situation$/)
    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: '곡 삭제' }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs\?tab=situation$/)
    await expect(page.getByRole('tab', { name: '상황 3' })).toHaveAttribute('aria-selected', 'true')
    await expect(songRow(page, '라인업송')).toHaveCount(0)
  })

  test('TC-131 응원가 시작 없는 장승현을 미리 듣고 「지금 위치로」로 채워 응원 화면에서 「응원가로」 [YT]', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await page.goto('/team/samsung/songs')
    await page.getByRole('button', { name: /응원가 시작 없는 곡/ }).click()
    await expect(page.locator('.song-item-title')).toHaveText(['장승현', '김상준'])
    await songRow(page, '장승현').locator('.song-item-main').click()
    const now = page.getByRole('button', { name: '응원가 시작을 지금 위치로' })
    await expect(now).toBeDisabled()
    await expectPlayerReady(page)
    await page.getByRole('button', { name: '처음부터' }).click()
    await waitPlayingIn(page, { start: JANG.start + 4, end: JANG.end, videoId: JANG.videoId })
    await expect(now).toBeEnabled()
    await expect(page.locator('.segment-head')).toHaveCSS('opacity', '1')
    await now.click()
    const value = await formField(page, '응원가 시작').inputValue()
    note(testInfo, '「지금 위치로」 값', value)
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/samsung\/songs\?missing=1$/)
    await expect(page.locator('.song-item-title')).toHaveText(['김상준'])
    const saved = (await storedSongs(page)).find((s) => s.id === JANG.id)?.cheerStart ?? 0
    expect(saved).toBeGreaterThan(JANG.start)
    expect(saved).toBeLessThan(JANG.end)

    await page.goto('/team/samsung')
    await expectPlayerReady(page)
    await playerButton(page, '장승현').click()
    await waitPlayingIn(page, { start: JANG.start, end: saved, videoId: JANG.videoId })
    await page.locator('button.skip-btn').click()
    const jumped = await waitPlayingIn(page, { start: saved, end: saved + 3 })
    note(testInfo, '「응원가로」 뒤 위치', `${jumped.time.toFixed(2)} (저장한 응원가 시작 ${saved})`)
  })

  test('TC-132 넓은 화면은 목록과 수정 칸을 나란히 둔다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/team/hanwha/songs')
    await expect(page.locator('.songs-detail-empty')).toBeVisible()
    await songRow(page, '노시환').locator('.song-item-main').click()
    await expect(page.getByRole('heading', { name: '노시환' })).toBeVisible()
    await expect(songRow(page, '노시환').locator('.song-item-main')).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.song-items')).toBeVisible()
    await expect(page.locator('.player-host iframe')).toBeVisible()
    const list = await page.locator('.song-list-page').boundingBox()
    const detail = await page.locator('.songs-detail').boundingBox()
    expect(list && detail && detail.x > list.x + list.width - 1).toBe(true)
    // 다른 곡을 누르면 화면을 옮기지 않고 오른쪽 칸만 바뀐다
    await songRow(page, '문현빈').locator('.song-item-main').click()
    await expect(page.getByRole('heading', { name: '문현빈' })).toBeVisible()
    await expect(page.locator('.song-items')).toBeVisible()
  })
})
