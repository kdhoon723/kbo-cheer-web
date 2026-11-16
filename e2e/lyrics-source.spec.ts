//20241476-김도훈-(2026-11-16)
import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { TeamId } from '../src/types.ts'
import { apiKeyMissing, expectPlayerReady, nowTitle, playerButton } from './helpers.ts'

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

// 3-⑳ 때의 예전 형식(녹음 기준, key 없음). 배포 뒤 하루 동안 브라우저 캐시에 남아 있던 파일이다
const OLD_FORMAT = JSON.stringify({
  teamId: 'hanwha',
  songs: [{ videoId: 'XXXXXXXXXXX', start: 10, kind: 'player', title: '노시환', lyrics: '예전 가사', source: 'https://namu.wiki/w/x' }],
})

test.describe('26. 바뀐 가사 파일을 바로 받기 [STEP 3-㉚]', () => {
  test.skip(!existsSync(LYRICS_DIR), '가사 폴더(media-build/lyrics)가 없는 실행. npm run media 뒤에 돈다')

  test('TC-162 예전 형식 파일이 버전 없는 주소에 남아 있어도 새 주소로 받아 가사가 보인다 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    const requested: string[] = []
    // 버전 없는 주소는 캐시에 남은 예전 파일을 돌려주는 것처럼 흉내 낸다
    await page.route(
      (url) => url.pathname === '/lyrics/hanwha.json' && url.search === '',
      (route) => route.fulfill({ contentType: 'application/json', headers: { 'Cache-Control': 'public, max-age=86400' }, body: OLD_FORMAT }),
    )
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.pathname.startsWith('/lyrics/')) requested.push(url.pathname + url.search)
    })
    await page.goto('/team/hanwha')
    await expectPlayerReady(page)
    // 같은 컨텍스트에서 예전 파일을 먼저 받아 둔다(3-㉘ 전 앱이 받던 주소)
    expect(await page.evaluate(async () => (await (await fetch('/lyrics/hanwha.json')).json()).songs[0].lyrics)).toBe('예전 가사')
    await playerButton(page, '노시환').click()
    const block = page.locator('.player-card-area, .player-lyrics')
    const noh = JSON.parse(readFileSync(new URL('hanwha.json', LYRICS_DIR), 'utf8')).songs.find((s: LyricRow) => s.kind === 'player' && s.title === '노시환')
    await expect(block.locator('.lyrics-text')).toHaveText(noh.lyrics)
    expect(requested.at(-1)).toMatch(/^\/lyrics\/hanwha\.json\?v=[0-9a-f]{8}$/)
  })

  test('TC-163 받은 가사 파일 형식이 틀리면 비우지 않고 다음 재생 때 다시 받는다 [YT]', async ({ page }) => {
    test.setTimeout(90_000)
    let calls = 0
    // 앱이 가사를 받을 때 넘긴 fetch 캐시 방식을 적어 둔다(route는 브라우저 캐시보다 앞이라 이 값이 보이지 않는다)
    await page.addInitScript(() => {
      const original = window.fetch
      const modes: (string | null)[] = []
      Object.assign(window, { lyricsFetchModes: modes })
      window.fetch = (input, init) => {
        if (String(input).includes('/lyrics/')) modes.push(init?.cache ?? null)
        return original(input, init)
      }
    })
    await page.route(
      (url) => url.pathname === '/lyrics/hanwha.json',
      async (route) => {
        calls++
        if (calls === 1) await route.fulfill({ contentType: 'application/json', body: OLD_FORMAT })
        else await route.continue()
      },
    )
    await page.goto('/team/hanwha')
    await expectPlayerReady(page)
    await playerButton(page, '노시환').click()
    await expect(nowTitle(page)).toHaveText('노시환')
    await expect.poll(() => calls).toBe(1)
    await expect(page.locator('.player-panel .lyrics')).toHaveCount(0)

    // 다음 재생에서 다시 받는다(브라우저 캐시를 그대로 쓰지 않고 서버에 확인)
    await page.getByRole('tab', { name: /^팀 응원가/ }).first().click()
    await page.locator('.team-song-list').first().getByRole('button', { name: '불타는 태양', exact: true }).click()
    await expect(page.locator('.player-card-area, .player-lyrics').locator('.lyrics-text')).toHaveText(lyricOf('hanwha', '불타는 태양').lyrics)
    expect(calls).toBe(2)
    const modes = await page.evaluate(() => (window as unknown as { lyricsFetchModes: (string | null)[] }).lyricsFetchModes)
    expect(modes).toEqual([null, 'no-cache'])
  })
})
