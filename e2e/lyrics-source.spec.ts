//20241476-김도훈-(2026-11-16)
import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { TeamId } from '../src/types.ts'
import { apiKeyMissing, expectPlayerReady, nowTitle } from './helpers.ts'

const LYRICS_DIR = new URL('../media-build/lyrics/', import.meta.url)

interface LyricRow {
  kind: string
  title: string
  lyrics: string
  source: string
}

function lyricOf(teamId: TeamId, title: string): LyricRow {
  const file: { songs: LyricRow[] } = JSON.parse(readFileSync(new URL(`${teamId}.json`, LYRICS_DIR), 'utf8'))
  const row = file.songs.find((s) => s.kind === 'song' && s.title === title)
  if (!row) throw new Error(`가사 없음: ${teamId} ${title}`)
  return row
}

async function playTeamSong(page: Page, teamId: TeamId, title: string) {
  await page.goto(`/team/${teamId}`)
  await expectPlayerReady(page)
  await page.getByRole('tab', { name: /^팀 응원가/ }).first().click()
  await page.locator('.team-song-list').first().getByRole('button', { name: title, exact: true }).click()
  await expect(nowTitle(page)).toHaveText(title)
}

test.describe('25. 가사 출처와 이름으로 찾기 [STEP 3-㉘]', () => {
  test.skip(!existsSync(LYRICS_DIR), '가사 폴더(media-build/lyrics)가 없는 실행. npm run media 뒤에 돈다')

  test('TC-158 KT는 구단 공식 사이트, 한화는 나무위키 출처 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    await playTeamSong(page, 'kt', '투혼가')
    const block = page.locator('.player-card-area, .player-lyrics')
    await expect(block.locator('.lyrics-text')).toHaveText(lyricOf('kt', '투혼가').lyrics)
    const kt = block.locator('.lyrics-source')
    await expect(kt).toHaveText('출처: 구단 공식 사이트')
    await expect(kt.locator('a')).toHaveAttribute('href', lyricOf('kt', '투혼가').source)
    await expect(kt).not.toContainText('CC BY-NC-SA')

    await playTeamSong(page, 'hanwha', '불타는 태양')
    const hanwha = block.locator('.lyrics-source')
    await expect(hanwha).toHaveText(/^출처: 나무위키 「한화 이글스\/응원가.*」 · CC BY-NC-SA 2\.0 KR$/)
  })

  test('TC-159 여러 구단 영상으로 새로 넣은 곡에도 이름으로 가사가 붙는다 [API][YT]', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/team/samsung/songs/add')
    test.skip(await apiKeyMissing(page), 'API 키가 없어 가져오기 화면이 비활성')
    await page.getByRole('textbox', { name: 'YouTube 영상 주소' }).fill('https://www.youtube.com/watch?v=hWF7dU4-fQU')
    await page.getByRole('button', { name: '불러오기' }).click()
    await page.getByRole('button', { name: '구단별로 나눠 넣기' }).click()
    await page.getByRole('button', { name: '17곡 저장' }).click()
    await expect(page).toHaveURL(/\/team\/samsung\/songs/)

    // 처음 데이터에 없던 곡: 한화 「하나 되어 외쳐」(나무위키), 키움 「승리의 함성」(구단 공식 사이트)
    await playTeamSong(page, 'hanwha', '하나 되어 외쳐')
    const block = page.locator('.player-card-area, .player-lyrics')
    await expect(block.locator('.lyrics-text')).toHaveText(lyricOf('hanwha', '하나 되어 외쳐').lyrics)
    await expect(block.locator('.lyrics-source')).toContainText('나무위키')
    await playTeamSong(page, 'kiwoom', '승리의 함성')
    await expect(block.locator('.lyrics-text')).toHaveText(lyricOf('kiwoom', '승리의 함성').lyrics)
    await expect(block.locator('.lyrics-source')).toHaveText('출처: 구단 공식 사이트')
  })
})
