//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  HISTORY_KEY,
  gotoHanwha,
  playerButton,
  playerId,
  playerNames,
  presetSongs,
  presetStorage,
  seedSong,
  songRow,
  starterOrder,
  toast,
} from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')
const MOON = seedSong('hanwha', '문현빈')
const PERAJA = seedSong('hanwha', '페라자')

function cellOf(page: Page, title: string): Locator {
  return page.locator('.player-cell').filter({ has: page.locator('.player-name', { hasText: new RegExp(`^${title}$`) }) })
}

async function mediaAvailable(page: Page): Promise<boolean> {
  const res = await page.request.get(`/players/hanwha/${playerId('hanwha', '노시환')}.webp`)
  return res.ok() && (res.headers()['content-type'] ?? '').startsWith('image/')
}

test.describe('12. 선수 정보와 사진 [STEP 3-⑪]', () => {
  test('TC-75 선수 칸 구성(이름, 포지션, 사진 자리)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await gotoHanwha(page)
    const cell = cellOf(page, '노시환')
    await expect(cell.locator('.player-sub')).toHaveText('3루수')
    // 이름과 포지션이 버튼 이름을 어지럽히지 않는다
    await expect(playerButton(page, '노시환')).toHaveCount(1)

    const geometry = await page.locator('.player-cell').evaluateAll((cells) =>
      cells.map((el) => {
        const box = el.getBoundingClientRect()
        const portrait = el.querySelector('.portrait')?.getBoundingClientRect()
        const name = el.querySelector('.player-name')?.getBoundingClientRect()
        return {
          height: Math.round(box.height),
          bottomGap: portrait ? Math.round((box.bottom - portrait.bottom) * 10) / 10 : null,
          rightGap: portrait ? Math.round((box.right - portrait.right) * 10) / 10 : null,
          size: portrait ? [Math.round(portrait.width), Math.round(portrait.height)] : null,
          nameBelowPortraitTop: name && portrait ? name.bottom > portrait.top : null,
        }
      }),
    )
    expect(new Set(geometry.map((g) => g.height)).size, '한 팀 격자의 칸 높이가 모두 같다').toBe(1)
    for (const g of geometry) {
      expect(g.size).toEqual([40, 50])
      expect(g.bottomGap, '사진이 칸 아래 선에 붙는다').toBe(0)
      expect(g.rightGap).toBe(8)
      expect(g.nameBelowPortraitTop, '이름이 사진 위에 겹치지 않는다').toBe(false)
    }
    const radius = await cell.locator('.portrait').evaluate((el) => getComputedStyle(el).borderRadius)
    expect(radius).toBe('3px 3px 0px 0px')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })

  test('TC-76 기본 정렬은 주전순이고 가나다 순과 다르다', async ({ page }) => {
    await gotoHanwha(page)
    await expect(page.getByRole('button', { name: '주전순', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const starters = await playerNames(page).allTextContents()
    expect(starters).toEqual(starterOrder('hanwha'))
    await page.getByRole('button', { name: '가나다', exact: true }).click()
    const byName = await playerNames(page).allTextContents()
    expect(byName).toEqual([...starters].sort((a, b) => a.localeCompare(b, 'ko')))
    expect(byName).not.toEqual(starters)
    await expect(page.locator('.player-sub').filter({ hasText: /번$/ })).toHaveCount(0)
  })

  test('TC-77 자주 튼 정렬과 횟수 표시', async ({ page }) => {
    await gotoHanwha(page)
    const starters = starterOrder('hanwha')
    const target = starters[6]
    await expect(playerNames(page).nth(6)).toHaveText(target)
    await page.getByRole('button', { name: '자주 튼', exact: true }).click()
    await expect(playerNames(page)).toHaveText(starters)
    await expect(page.locator('.player-sub').filter({ hasText: /번$/ })).toHaveCount(0)

    await playerButton(page, target).click()
    await expect(cellOf(page, target).locator('.player-sub').last()).toHaveText('1번')
    await playerButton(page, target).click()
    await expect(cellOf(page, target).locator('.player-sub').last()).toHaveText('2번')
    await expect(page.locator('.player-sub').filter({ hasText: /번$/ })).toHaveCount(1)
    // 곡을 누를 때마다 칸이 옮겨 가지 않는다
    await expect(playerNames(page).nth(6)).toHaveText(target)

    await page.getByRole('button', { name: '주전순', exact: true }).click()
    await page.getByRole('button', { name: '자주 튼', exact: true }).click()
    await expect(playerNames(page).first()).toHaveText(target)
    await expect(playerNames(page)).toHaveText([target, ...starters.filter((n) => n !== target)])
    await page.reload()
    await expect(playerNames(page).first()).toHaveText(target)
    await expect(cellOf(page, target).locator('.player-sub').last()).toHaveText('2번')
  })

  test('TC-78 최근 곡은 새로고침 뒤에도 남고 지운 곡은 숨긴다', async ({ page }) => {
    await gotoHanwha(page)
    const search = page.getByRole('searchbox', { name: '곡 검색' })
    await search.focus()
    await expect(page.getByText('아직 튼 곡이 없습니다')).toBeVisible()
    await page.keyboard.press('Escape')

    await playerButton(page, '노시환').click()
    await playerButton(page, '문현빈').click()
    await playerButton(page, '페라자').click()
    await page.reload()
    await page.locator('.player-grid button').first().waitFor()
    await search.focus()
    const recent = page.locator('.recent .result-list button .song-line-title')
    await expect(recent).toHaveText(['페라자', '문현빈', '노시환'])
    await page.keyboard.press('Escape')

    page.once('dialog', (d) => void d.accept())
    await page.goto('/team/hanwha/songs')
    await songRow(page, '문현빈').getByRole('button', { name: '삭제' }).click()
    await expect(songRow(page, '문현빈')).toHaveCount(0)
    await gotoHanwha(page)
    await search.focus()
    await expect(recent).toHaveText(['페라자', '노시환'])
  })

  test('TC-79 기록에 없는 곡 id가 섞여도 화면이 깨지지 않고 눌러 재생한다', async ({ page }) => {
    await presetStorage(
      page,
      HISTORY_KEY,
      JSON.stringify({ version: 1, counts: { [NOH.id]: 2, gone: 5 }, recent: ['gone', NOH.id, MOON.id] }),
    )
    await gotoHanwha(page)
    await page.getByRole('searchbox', { name: '곡 검색' }).focus()
    await expect(page.locator('.recent .result-list button .song-line-title')).toHaveText(['노시환', '문현빈'])
    await page.locator('.recent .result-list button').first().click()
    await expect(page.locator('.player-panel .now-title')).toHaveText('노시환')
    // 고른 뒤에는 검색칸을 떠나 격자로 돌아온다
    await expect(page.locator('.recent')).toHaveCount(0)
    await expect(page.locator('.player-grid')).toBeVisible()
  })

  test('TC-80 다른 팀 곡을 최근 목록에서 누르면 그 팀 화면으로 바뀐다', async ({ page }) => {
    const kia = seedSong('kia', '김도영')
    await presetStorage(page, HISTORY_KEY, JSON.stringify({ version: 1, counts: { [kia.id]: 1 }, recent: [kia.id] }))
    await gotoHanwha(page)
    await page.getByRole('searchbox', { name: '곡 검색' }).focus()
    const row = page.locator('.recent .result-list button').first()
    await expect(row.locator('.result-team-name')).toHaveText('KIA')
    await row.click()
    await expect(page).toHaveURL(/\/team\/kia$/)
    await expect(page.locator('.player-panel .now-title')).toHaveText('김도영')
  })

  test('TC-81 사진 폴더가 없으면 구단 아바타만 보이고 깨진 그림이 없다', async ({ page }) => {
    const photoRequests: string[] = []
    await page.route('**/players/**', (route) => {
      photoRequests.push(new URL(route.request().url()).pathname)
      void route.abort()
    })
    await gotoHanwha(page)
    await expect.poll(() => photoRequests.length, { timeout: 5_000 }).toBeGreaterThan(0)
    await page.waitForTimeout(500)
    const state = await page.locator('.portrait').evaluateAll((els) =>
      els.map((el) => {
        const [avatar] = el.querySelectorAll('img')
        return {
          loadedPhotos: el.querySelectorAll('.portrait-photo').length,
          avatarOk: avatar instanceof HTMLImageElement && avatar.complete && avatar.naturalWidth > 0,
          avatarSrc: avatar?.getAttribute('src') ?? null,
        }
      }),
    )
    expect(state.length).toBe(22)
    for (const s of state) {
      expect(s.loadedPhotos, '실패한 사진 요소는 치운다').toBe(0)
      expect(s.avatarOk).toBe(true)
      expect(s.avatarSrc).toBe('/avatars/hanwha.webp')
    }
    expect(photoRequests.every((p) => p.startsWith('/players/hanwha/') && p.endsWith('.webp'))).toBe(true)
  })

  test('TC-82 사진이 없는 선수와 이어지지 않은 곡은 사진 주소를 요청하지 않는다', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (req) => {
      const { pathname } = new URL(req.url())
      if (pathname.startsWith('/players/')) requested.push(pathname)
    })
    const base = { ...PERAJA, teamId: 'kiwoom' as const }
    await presetSongs(page, [
      { ...base, id: 'np-1', title: '김동규', order: 0 },
      { ...base, id: 'np-2', title: '없는선수', order: 1 },
    ])
    await page.goto('/team/kiwoom')
    await expect(page.locator('.player-cell')).toHaveCount(2)
    await expect(cellOf(page, '김동규').locator('.player-sub')).toHaveText('투수')
    await expect(cellOf(page, '없는선수').locator('.player-sub')).toHaveText('')
    for (const img of await page.locator('.portrait img').all()) {
      await expect(img).toHaveAttribute('src', '/avatars/kiwoom.webp')
    }
    await page.waitForTimeout(500)
    expect(requested).toEqual([])
  })

  test('TC-83 사진이 있으면 칸·검색 결과·재생 줄에 선수 사진이 나온다', async ({ page }) => {
    test.skip(!(await mediaAvailable(page)), '최적화한 사진(media-build, npm run media)이 없어 건너뜀')
    await gotoHanwha(page)
    const url = `/players/hanwha/${playerId('hanwha', '노시환')}.webp`
    await expect(cellOf(page, '노시환').locator('.portrait-photo.is-loaded')).toHaveAttribute('src', url)

    await page.getByRole('searchbox', { name: '곡 검색' }).fill('노시환')
    const row = page.locator('.result-list button').first()
    await expect(row.locator('.portrait-photo.is-loaded')).toHaveAttribute('src', url)
    const box = await row.evaluate((el) => {
      const b = el.getBoundingClientRect()
      const p = el.querySelector('.portrait')?.getBoundingClientRect()
      return { h: b.height, gap: p ? b.bottom - p.bottom : null, size: p ? [p.width, p.height] : null }
    })
    expect(box.h).toBeGreaterThanOrEqual(44)
    expect(box.gap).toBe(0)
    expect(box.size).toEqual([32, 40])
    await row.click()
    await expect(page.locator('.dock .play-row .portrait-photo.is-loaded')).toHaveAttribute('src', url)
  })

  test('TC-84 재생 줄은 선수 곡이면 사진, 아니면 구단 로고 판', async ({ page }) => {
    await gotoHanwha(page)
    await playerButton(page, '노시환').click()
    await expect(page.locator('.dock .play-row .portrait')).toHaveCount(1)
    await expect(page.locator('.dock .play-row .logo-plate')).toHaveCount(0)
    await page.locator('.dock-situations .situation-cell').first().click()
    await expect(page.locator('.dock .play-row .logo-plate')).toHaveCount(1)
    await expect(page.locator('.dock .play-row .portrait')).toHaveCount(0)
  })

  test('TC-85 튼 기록 저장 실패는 한 번만 알린다', async ({ page }) => {
    await gotoHanwha(page)
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'kboCheer.history') throw new DOMException('full', 'QuotaExceededError')
        original.call(this, key, value)
      }
    })
    await playerButton(page, '노시환').click()
    await expect(toast(page)).toHaveText(/튼 기록을 저장하지 못했습니다/)
    await toast(page).click()
    await expect(toast(page)).toHaveCount(0)
    await playerButton(page, '페라자').click()
    await page.waitForTimeout(500)
    await expect(toast(page)).toHaveCount(0)
  })

  test('TC-86 예전 정렬 값(chapter)을 읽어도 볼륨이 남고 주전순으로 열린다', async ({ page }) => {
    await presetStorage(page, 'kboCheer.settings', JSON.stringify({ version: 1, volume: 35, gridSort: 'chapter' }))
    await gotoHanwha(page)
    await expect(page.getByRole('button', { name: '주전순', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(playerNames(page)).toHaveText(starterOrder('hanwha'))
    await expect(page.getByRole('slider')).toHaveValue('35')
    await page.reload()
    await expect(page.getByRole('slider')).toHaveValue('35')
  })

  test('TC-96 휴대폰 정렬 선택 시트', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await gotoHanwha(page)
    // 탭과 정렬이 한 줄이라 격자가 탭 줄 바로 아래에서 시작한다
    const tabBar = await page.locator('.tab-bar').boundingBox()
    const firstCell = await page.locator('.player-grid button').first().boundingBox()
    expect(tabBar?.height ?? 0).toBeLessThan(60)
    expect((firstCell?.y ?? 0) - ((tabBar?.y ?? 0) + (tabBar?.height ?? 0))).toBeLessThan(24)
    await expect(page.locator('.sort-toggle')).toBeHidden()
    const picker = page.getByRole('button', { name: /^선수 정렬: / })
    await expect(picker).toHaveText('주전순')
    for (const name of ['가나다', '자주 튼', '주전순']) {
      await picker.click()
      const sheet = page.getByRole('dialog', { name: '선수 정렬' })
      await sheet.getByRole('button', { name, exact: true }).click()
      await expect(sheet).toBeHidden()
      await expect(picker).toHaveText(name)
      if (name === '가나다') {
        const names = await playerNames(page).allTextContents()
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')))
      }
    }
    await page.reload()
    await expect(page.getByRole('button', { name: /^선수 정렬: / })).toHaveText('주전순')
  })

  test('TC-97 누끼와 격자 사진은 원래 비율로 그린다', async ({ page }) => {
    test.skip(!(await mediaAvailable(page)), '최적화한 사진(media-build, npm run media)이 없어 건너뜀')
    await page.setViewportSize({ width: 1440, height: 900 })
    await presetStorage(page, 'kboCheer.team', JSON.stringify({ version: 1, currentTeamId: 'hanwha', prevTeamId: 'samsung' }))
    await gotoHanwha(page)
    // 류지혁 누끼는 300×260(가로/세로 1.15)이라, 4:5로 고정하던 예전 자리에서는 가로로 눌렸다
    await page.locator('.board-column').nth(1).locator('.player-grid button', { hasText: '류지혁' }).click()
    const cutout = page.locator('.card-cutout.is-loaded')
    await expect(cutout).toHaveCount(1)
    const shapes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>('.card-cutout.is-loaded, .portrait-cell .portrait-photo.is-loaded')].map((img) => ({
        cls: img.className,
        fit: getComputedStyle(img).objectFit,
        natural: img.naturalWidth / img.naturalHeight,
        box: img.clientWidth / img.clientHeight,
      })),
    )
    const card = shapes.filter((s) => s.cls.startsWith('card-cutout'))
    const grid = shapes.filter((s) => s.cls.startsWith('portrait-photo'))
    expect(card).toHaveLength(1)
    expect(grid.length).toBeGreaterThan(10)
    // 누끼는 상자가 그림 비율을 따르고, 격자 사진은 4:5 자리를 잘라 채운다(cover). 어느 쪽도 늘이지(fill) 않는다
    expect(card[0].fit).toBe('contain')
    expect(Math.abs(card[0].box - card[0].natural) / card[0].natural).toBeLessThan(0.01)
    for (const g of grid) {
      expect(g.fit).toBe('cover')
      expect(Math.abs(g.box - g.natural) / g.natural).toBeLessThan(0.01)
    }
  })
})
