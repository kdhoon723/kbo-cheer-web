//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import {
  expectPlayerReady,
  formField,
  formFieldLabel,
  gotoHanwha,
  navLink,
  note,
  nowTitle,
  openEdit,
  playerButton,
  seedSong,
  songRow,
  storedSongs,
  waitNotPlaying,
  waitPlayingIn,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')

test.describe('6. 곡 수정·삭제', () => {
  test('TC-38 곡 수정과 유지', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await openEdit(page, 'hanwha', '노시환')
    await formField(page, '이름').fill('노시환(수정)')
    await formField(page, '시작').fill('07:00')
    await formField(page, '끝').fill('07:30')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    await expect(songRow(page, '노시환(수정)').locator('.song-row-range')).toHaveText('07:00 ~ 07:30')
    await page.reload()
    await expect(songRow(page, '노시환(수정)').locator('.song-row-range')).toHaveText('07:00 ~ 07:30')
    await expect(songRow(page, '노시환')).toHaveCount(0)

    await gotoHanwha(page)
    await expectPlayerReady(page)
    await playerButton(page, '노시환(수정)').click()
    const s = await waitPlayingIn(page, { start: 420, end: 450, videoId: NOH.videoId })
    note(testInfo, '수정한 곡 첫 재생 위치', s.time.toFixed(2))
    expect(s.time).toBeLessThan(422.5)
  })

  test('TC-39 수정 입력 오류', async ({ page }) => {
    await openEdit(page, 'hanwha', '노시환')
    const editUrl = page.url()
    const cases = [
      { name: '시작 ≥ 끝', field: '시작', value: '08:00', errorAt: '끝', error: '끝 시각은 시작 시각보다 뒤여야 합니다' },
      { name: '끝 99:00', field: '끝', value: '99:00', errorAt: '끝', error: '끝 시각은 영상 길이(53:21) 이하여야 합니다' },
      { name: '6분54초', field: '시작', value: '6분54초', errorAt: '시작', error: '시각을 00:00 형식으로 입력해 주세요' },
      { name: '빈 이름', field: '이름', value: '', errorAt: '이름', error: '이름을 입력해 주세요' },
    ]
    for (const c of cases) {
      await page.goto(editUrl)
      await formField(page, c.field).fill(c.value)
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect(formFieldLabel(page, c.errorAt).locator('.form-error'), c.name).toHaveText(c.error)
      await expect(page).toHaveURL(editUrl)
      const stored = (await storedSongs(page)).find((s) => s.id === NOH.id)
      expect(stored, c.name).toMatchObject({ title: '노시환', start: 414, end: 475, cheerStart: null })
    }
  })

  test('TC-40 종류 변경과 응원가 시작', async ({ page }, testInfo) => {
    await openEdit(page, 'hanwha', '노시환')
    await formField(page, '응원가 시작(선수 곡만, 비워도 됩니다)').fill('07:10')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    expect((await storedSongs(page)).find((s) => s.id === NOH.id)?.cheerStart).toBe(430)

    await openEdit(page, 'hanwha', '노시환')
    const cheer = formField(page, '응원가 시작(선수 곡만, 비워도 됩니다)')
    await expect(cheer).toHaveValue('07:10')
    await formField(page, '종류').selectOption({ label: '상황' })
    await expect(cheer).toHaveValue('')
    await expect(cheer).toBeDisabled()
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
    const stored = (await storedSongs(page)).find((s) => s.id === NOH.id)
    note(testInfo, '저장값', stored)
    expect(stored).toMatchObject({ kind: 'situation', cheerStart: null })
  })

  test('TC-41 잘못된 수정 주소', async ({ page }) => {
    const diaz = seedSong('samsung', '디아즈')
    for (const id of [diaz.id, 'no-such-song']) {
      await page.goto(`/team/hanwha/songs/${id}/edit`)
      await expect(page.getByText('곡을 찾을 수 없습니다')).toBeVisible()
      await expect(page.getByRole('link', { name: '곡 관리로 돌아가기' })).toHaveAttribute('href', '/team/hanwha/songs')
    }
    await page.getByRole('link', { name: '곡 관리로 돌아가기' }).click()
    await expect(page).toHaveURL(/\/team\/hanwha\/songs$/)
  })

  test('TC-42 삭제 취소·삭제', async ({ page }) => {
    await page.goto('/team/hanwha/songs')
    const messages: string[] = []
    page.once('dialog', (d) => {
      messages.push(d.message())
      void d.dismiss()
    })
    await songRow(page, '페라자').getByRole('button', { name: '삭제' }).click()
    await expect(songRow(page, '페라자')).toHaveCount(1)
    expect(await storedSongs(page)).toHaveLength(507)

    page.once('dialog', (d) => {
      messages.push(d.message())
      void d.accept()
    })
    await songRow(page, '페라자').getByRole('button', { name: '삭제' }).click()
    await expect(songRow(page, '페라자')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '선수 (21)' })).toBeVisible()
    const songs = await storedSongs(page)
    expect(songs).toHaveLength(506)
    expect(songs.some((s) => s.title === '페라자')).toBe(false)
    expect(messages).toEqual(["'페라자'을(를) 삭제합니다", "'페라자'을(를) 삭제합니다"])
    await page.getByRole('link', { name: '백업·초기화' }).click()
    await expect(page.getByText('현재 곡 506곡')).toBeVisible()
  })

  test('TC-43 재생 중 곡 삭제', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const ferraz = seedSong('hanwha', '페라자')
    await gotoHanwha(page)
    await expectPlayerReady(page)
    await playerButton(page, '페라자').click()
    await waitPlayingIn(page, { start: ferraz.start, end: ferraz.end, videoId: ferraz.videoId })
    await navLink(page, '곡 관리').click()
    page.once('dialog', (d) => void d.accept())
    await songRow(page, '페라자').getByRole('button', { name: '삭제' }).click()
    const s = await waitNotPlaying(page, 3_000)
    note(testInfo, '삭제 뒤 플레이어 상태', s)
    await expect(nowTitle(page)).toHaveText('선택한 곡 없음')
    expect((await storedSongs(page)).some((x) => x.title === '페라자')).toBe(false)
  })
})
