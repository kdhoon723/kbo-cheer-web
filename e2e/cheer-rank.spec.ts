//20241476-김도훈-(2026-11-16)
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { TeamId } from '../src/types.ts'
import {
  SONGS_KEY,
  expectPlayerReady,
  note,
  playerButton,
  presetSongs,
  presetStorage,
  seedSong,
  seedSongs,
  storedSongs,
  waitPlayingIn,
} from './helpers.ts'

interface RankRow {
  teamId: TeamId
  title: string
  rank: number
}

const RANKS: RankRow[] = JSON.parse(readFileSync(new URL('../src/data/team-song-ranks.json', import.meta.url), 'utf8'))

function top3(teamId: TeamId): string[] {
  return RANKS.filter((r) => r.teamId === teamId)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((r) => r.title)
}

/** 진행 막대에서 눈금 가운데가 놓인 비율 */
async function markRatio(page: Page, scope: string): Promise<number> {
  return page.evaluate((scope) => {
    const bar = document.querySelector(`${scope} .progress`)?.getBoundingClientRect()
    const mark = document.querySelector(`${scope} .progress-cheer`)?.getBoundingClientRect()
    if (!bar || !mark) return -1
    return (mark.left + mark.width / 2 - bar.left) / bar.width
  }, scope)
}

test.describe('15. 응원가 시작 지점과 팀 응원가 정렬 [STEP 3-⑲]', () => {
  test('TC-103 예전 저장 목록은 비어 있는 응원가 시작만 한 번 채운다', async ({ page }, testInfo) => {
    const kim = seedSong('nc', '김주원')
    const old = seedSongs().map((s) => ({ ...s, cheerStart: s.id === kim.id ? kim.start + 3 : null }))
    // 처음 데이터 차례(seedRevision)가 없는 예전 모양 그대로 넣는다
    await presetSongs(page, old)
    await page.goto('/team/nc')
    await expect(page.locator('.player-grid button').first()).toBeVisible()
    const songs = await storedSongs(page)
    const filled = songs.filter((s) => s.cheerStart !== null)
    note(testInfo, '채워진 곡 수', filled.length)
    expect(filled).toHaveLength(120)
    expect(songs.find((s) => s.id === kim.id)?.cheerStart).toBe(kim.start + 3)
    const raw = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), SONGS_KEY)) ?? '{}')
    expect(raw.seedRevision).toBe(1)

    // 채운 뒤 사용자가 한 곡의 값을 지우면 새로고침해도 되살아나지 않는다
    const pwk = seedSong('nc', '권희동')
    await page.evaluate(
      ({ key, id }) => {
        const data = JSON.parse(localStorage.getItem(key) ?? '{}')
        data.songs = data.songs.map((s: { id: string }) => (s.id === id ? { ...s, cheerStart: null } : s))
        localStorage.setItem(key, JSON.stringify(data))
      },
      { key: SONGS_KEY, id: pwk.id },
    )
    await page.reload()
    await expect(page.locator('.player-grid button').first()).toBeVisible()
    expect((await storedSongs(page)).find((s) => s.id === pwk.id)?.cheerStart).toBeNull()
  })

  test('TC-104 처음 데이터의 응원가 시작으로 건너뛰고 진행 막대 눈금이 그 자리에 있다', async ({ page }, testInfo) => {
    test.setTimeout(150_000)
    const picks: [TeamId, string][] = [
      ['nc', '권희동'],
      ['nc', '박건우'],
      ['doosan', '박찬호'],
      ['doosan', '양의지'],
    ]
    for (const [teamId, title] of picks) {
      const song = seedSong(teamId, title)
      const cheer = song.cheerStart ?? 0
      expect(song.cheerStart, title).not.toBeNull()
      await page.goto('/team/' + teamId)
      await expectPlayerReady(page)
      await playerButton(page, title).click()
      await waitPlayingIn(page, { start: song.start, end: cheer, videoId: song.videoId })
      const expected = (cheer - song.start) / (song.end - song.start)
      const ratio = await markRatio(page, '.dock')
      note(testInfo, `${title} 눈금`, { expected: expected.toFixed(4), ratio: ratio.toFixed(4) })
      expect(Math.abs(ratio - expected)).toBeLessThan(0.005)
      await page.locator('button.skip-btn').click()
      const jumped = await waitPlayingIn(page, { start: cheer, end: cheer + 3 })
      note(testInfo, `${title} 「응원가로」 뒤 위치`, `${jumped.time.toFixed(2)} (응원가 시작 ${cheer})`)
    }
  })

  test('TC-105 팀 응원가는 인기순이 기본이고 고른 정렬을 저장한다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await presetStorage(page, 'kboCheer.team', JSON.stringify({ version: 1, currentTeamId: 'hanwha', prevTeamId: 'samsung' }))
    await page.goto('/team/hanwha')
    const tabs = page.getByRole('tab', { name: /^팀 응원가/ })
    await tabs.nth(0).click()
    await tabs.nth(1).click()
    const columns = page.locator('.board-column')
    for (const [i, teamId] of [[0, 'hanwha'], [1, 'samsung']] as const) {
      const column = columns.nth(i)
      await expect(column.getByRole('group', { name: '팀 응원가 정렬' }).getByRole('button', { pressed: true })).toHaveText('인기순')
      await expect(column.locator('.song-line-title').first()).toHaveText(top3(teamId)[0])
      expect((await column.locator('.song-line-title').allTextContents()).slice(0, 3)).toEqual(top3(teamId))
    }

    // 영상 순은 처음 데이터 순서, 가나다는 가나다 순
    const hanwha = columns.nth(0)
    const byVideo = seedSongs()
      .filter((s) => s.teamId === 'hanwha' && s.kind === 'team')
      .sort((a, b) => a.order - b.order)
      .map((s) => s.title)
    await hanwha.getByRole('button', { name: '영상 순' }).click()
    await expect(hanwha.locator('.song-line-title')).toHaveText(byVideo)
    await hanwha.getByRole('button', { name: '가나다' }).click()
    await expect(hanwha.locator('.song-line-title')).toHaveText([...byVideo].sort((a, b) => a.localeCompare(b, 'ko')))

    // 정렬은 두 열이 함께 쓰고 새로고침 뒤에도 남는다
    await page.reload()
    await page.getByRole('tab', { name: /^팀 응원가/ }).nth(0).click()
    await expect(
      columns.nth(0).getByRole('group', { name: '팀 응원가 정렬' }).getByRole('button', { pressed: true }),
    ).toHaveText('가나다')

    // 휴대폰은 정렬 이름 버튼을 눌러 시트에서 고른다
    await page.setViewportSize({ width: 360, height: 640 })
    // 넓은 화면의 열과 휴대폰의 한 열은 다른 구성이라 탭이 처음(선수)으로 돌아간다. 보드가 사라진 뒤에 누른다
    await expect(page.locator('.board')).toHaveCount(0)
    await page.getByRole('tab', { name: /^팀 응원가/ }).click()
    const picker = page.getByRole('button', { name: /^팀 응원가 정렬: / })
    await expect(picker).toHaveText('가나다')
    await picker.click()
    await page.getByRole('dialog', { name: '팀 응원가 정렬' }).getByRole('button', { name: '인기순' }).click()
    await expect(picker).toHaveText('인기순')
    expect((await page.locator('.song-line-title').allTextContents()).slice(0, 3)).toEqual(top3('hanwha'))
  })

  test('TC-106 순위가 없는 곡은 인기순 맨 아래에 영상 순으로', async ({ page }) => {
    const songs = seedSongs()
    const team = songs.filter((s) => s.teamId === 'hanwha' && s.kind === 'team').sort((a, b) => a.order - b.order)
    // 직접 추가한 곡처럼 순위 자료와 이어지지 않게 시작 시각만 바꾼 곡 둘
    const mine = [team[0], team[1]].map((s, i) => ({ ...s, title: `직접 추가 ${i + 1}`, start: s.start + 1 }))
    await presetSongs(
      page,
      songs.map((s) => mine.find((m) => m.id === s.id) ?? s),
    )
    await page.goto('/team/hanwha')
    await page.getByRole('tab', { name: /^팀 응원가/ }).click()
    const titles = await page.locator('.song-line-title').allTextContents()
    expect(titles.slice(-2)).toEqual(['직접 추가 1', '직접 추가 2'])
  })
})
