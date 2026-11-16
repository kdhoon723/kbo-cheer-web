//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import {
  expectCurrentTeam,
  gotoHanwha,
  note,
  nowTeam,
  nowTitle,
  pickTeam,
  playerButton,
  playerNames,
  prevTeamButton,
  situationButton,
  starterOrder,
  teamSongs,
  teamTrigger,
} from './helpers.ts'

const TEAMS = [
  { id: 'kiwoom', name: '키움', color: '#820024' },
  { id: 'hanwha', name: '한화', color: '#FF6600' },
  { id: 'lotte', name: '롯데', color: '#041E42' },
  { id: 'ssg', name: 'SSG', color: '#CE0E2D' },
  { id: 'doosan', name: '두산', color: '#131230' },
  { id: 'nc', name: 'NC', color: '#315288' },
  { id: 'kia', name: 'KIA', color: '#EA0029' },
  { id: 'lg', name: 'LG', color: '#C30452' },
  { id: 'samsung', name: '삼성', color: '#074CA1' },
  { id: 'kt', name: 'KT', color: '#000000' },
] as const

function parseRgb(css: string): [number, number, number] {
  const m = /^rgba?\((\d+), (\d+), (\d+)/.exec(css)
  if (!m) throw new Error(`색 형식이 다름: ${css}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function hexToRgb(hex: string): [number, number, number] {
  const part = (i: number) => parseInt(hex.slice(i, i + 2), 16)
  return [part(1), part(3), part(5)]
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test.describe('2. 팀 선택·전환', () => {
  test('TC-01 첫 실행 팀 선택 화면', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '응원할 팀을 고르세요' })).toBeVisible()
    await expect(page.locator('.team-grid button')).toHaveText(TEAMS.map((t) => t.name))
    await expect(prevTeamButton(page)).toHaveAccessibleName('전 팀')
    await expect(prevTeamButton(page)).toBeDisabled()
  })

  test('TC-02 팀 선택과 선수 격자', async ({ page }) => {
    await page.goto('/')
    await page.locator('.team-grid').getByRole('button', { name: '한화', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    const expected = starterOrder('hanwha')
    expect(expected.slice(0, 3)).toEqual(['문현빈', '노시환', '강백호'])
    await expect(page.locator('.player-grid button')).toHaveCount(22)
    await expect(playerNames(page)).toHaveText(expected)
  })

  test('TC-03 마지막 팀 복원', async ({ page }) => {
    await page.goto('/')
    await page.locator('.team-grid').getByRole('button', { name: '한화', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await page.reload()
    await page.goto('/')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(playerNames(page).first()).toHaveText('문현빈')
  })

  test('TC-04 전 팀 전환', async ({ page }) => {
    await gotoHanwha(page)
    await teamTrigger(page).click()
    const sheet = page.getByRole('dialog', { name: '팀 고르기' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: '한화', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(teamTrigger(page)).toBeFocused()
    await pickTeam(page, 'samsung')
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(prevTeamButton(page)).toHaveAccessibleName('전 팀: 한화')
    await expect(prevTeamButton(page).locator('img')).toHaveAttribute('src', '/teams/hanwha.webp')
    await prevTeamButton(page).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expectCurrentTeam(page, 'hanwha')
    await expect(prevTeamButton(page)).toHaveAccessibleName('전 팀: 삼성')
    await prevTeamButton(page).click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expectCurrentTeam(page, 'samsung')
    await expect(prevTeamButton(page)).toHaveAccessibleName('전 팀: 한화')
  })

  test('TC-05 없는 팀 주소', async ({ page }) => {
    await page.goto('/team/nope')
    await expect(page.getByText('팀을 찾을 수 없습니다')).toBeVisible()
    const link = page.getByRole('link', { name: '처음 화면으로' })
    await expect(link).toHaveAttribute('href', '/')
    await link.click()
    await expect(page.getByRole('heading', { name: '응원할 팀을 고르세요' })).toBeVisible()
  })

  test('TC-06 구단 표시와 대비', async ({ page }, testInfo) => {
    const rows: { team: string; header: number; playing: number; band: string }[] = []
    const bg = hexToRgb('#131211')
    for (const team of TEAMS) {
      await page.goto(`/team/${team.id}`)
      await expectCurrentTeam(page, team.id)
      await expect(teamTrigger(page).locator('img')).toHaveAttribute('src', `/teams/${team.id}.webp`)
      const header = await page.locator('.app-header').evaluate((el) => {
        const name = el.querySelector('.team-trigger-name')
        return {
          background: getComputedStyle(el).backgroundColor,
          color: name ? getComputedStyle(name).color : '',
        }
      })
      expect(parseRgb(header.background), `${team.name} 머리말은 팀 색으로 칠하지 않는다`).toEqual(bg)

      const cell = page.locator('.player-grid button').first()
      await cell.click()
      await expect(cell).toHaveAttribute('aria-pressed', 'true')
      const playing = await cell.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { background: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow }
      })
      const [r, g, b] = hexToRgb(team.color)
      expect(playing.shadow, `${team.name} 재생 칸 위쪽 띠`).toContain(`rgb(${r}, ${g}, ${b})`)
      const stageBand = await page.locator('.player-stage').evaluate((el) => getComputedStyle(el).borderTopColor)
      expect(parseRgb(stageBand), `${team.name} 플레이어 위쪽 띠`).toEqual([r, g, b])

      const headerRatio = contrast(parseRgb(header.background), parseRgb(header.color))
      const playingRatio = contrast(parseRgb(playing.background), parseRgb(playing.color))
      rows.push({
        team: team.id,
        header: Number(headerRatio.toFixed(2)),
        playing: Number(playingRatio.toFixed(2)),
        band: team.color,
      })
      expect(headerRatio, `${team.name} 머리말 글자 대비`).toBeGreaterThanOrEqual(4.5)
      expect(playingRatio, `${team.name} 재생 칸 글자 대비`).toBeGreaterThanOrEqual(4.5)
    }
    note(testInfo, '머리말·재생 칸 대비', rows)
  })
})

test.describe('3. 메인 화면과 검색', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHanwha(page)
  })

  test('TC-07 격자 정렬', async ({ page }) => {
    const byName = teamSongs('hanwha', 'player')
      .map((s) => s.title)
      .sort((a, b) => a.localeCompare(b, 'ko'))
    expect(byName.slice(0, 3)).toEqual(['강백호', '김태연', '노시환'])
    await expect(page.getByRole('button', { name: '주전순', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: '가나다', exact: true }).click()
    await expect(playerNames(page)).toHaveText(byName)
    await page.reload()
    await expect(page.getByRole('button', { name: '가나다', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(playerNames(page)).toHaveText(byName)
    await page.getByRole('button', { name: '주전순', exact: true }).click()
    await expect(playerNames(page)).toHaveText(starterOrder('hanwha'))
  })

  test('TC-08 상황 버튼·팀 응원가', async ({ page }) => {
    const cells = page.locator('.dock-situations .situation-grid .situation-cell')
    await expect(cells).toHaveCount(8)
    const grid = await cells.evaluateAll((els) =>
      els.map((el) => ({
        name: el.querySelector('.situation-name')?.textContent ?? null,
        detail: el.querySelector('.situation-title')?.textContent ?? null,
        title: el.getAttribute('aria-label'),
        key: el.getAttribute('aria-keyshortcuts'),
      })),
    )
    const empty = { name: null, detail: null, title: null, key: null }
    // 칸에는 상황 이름을 크게 쓰고, 이름과 사실상 같은 곡 제목은 다시 쓰지 않는다
    expect(grid).toEqual([
      { name: '안타', detail: null, title: '공통 안타 송', key: '1' },
      empty,
      { name: '볼넷', detail: null, title: '볼넷 송', key: '3' },
      { name: '풀카운트', detail: null, title: '풀카운트 송', key: '4' },
      { name: '라인업', detail: null, title: '라인업송', key: '5' },
      empty,
      empty,
      empty,
    ])
    await expect(page.locator('.dock-situations .situation-cell.is-empty')).toHaveCount(4)
    const names = await page.locator('.dock-situations .situation-btn .situation-name').allInnerTexts()
    expect(new Set(names).size).toBe(names.length)
    await page.getByRole('tab', { name: /^팀 응원가/ }).click()
    await expect(page.locator('.team-song-list button')).toHaveCount(18)

    // 이름만으로 어느 곡인지 알 수 없으면 곡 제목을 아래 줄에 쓴다
    await page.goto('/team/lotte')
    for (const [title, name] of [
      ['수비 라인업송', '라인업 소개'],
      ['공격 라인업송', '라인업'],
    ]) {
      await expect(situationButton(page, title).locator('.situation-name')).toHaveText(name)
      await expect(situationButton(page, title).locator('.situation-title')).toHaveText(title)
    }
  })

  test('TC-09 초성·부분 검색', async ({ page }) => {
    const search = page.locator('.search-box')
    for (const q of ['ㄴㅅㅎ', '노시']) {
      await search.fill(q)
      await expect(page.locator('.result-list button').first(), `"${q}" 첫 결과`).toHaveText('노시환')
    }
  })

  test('TC-10 다른 팀 검색 결과', async ({ page }) => {
    await page.locator('.search-box').fill('디아즈')
    const hit = page.locator('.result-list button').filter({ hasText: '디아즈' })
    await expect(hit.locator('.song-line-title')).toHaveText('디아즈')
    await expect(hit.locator('.result-team-name')).toHaveText('삼성')
    await expect(hit.locator('.result-team img')).toHaveAttribute('src', '/teams/samsung.webp')
    await hit.click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(prevTeamButton(page)).toHaveAccessibleName('전 팀: 한화')
    await expect(page.locator('.search-box')).toHaveValue('')
    await expect(nowTitle(page)).toHaveText('디아즈')
    await expect(nowTeam(page)).toHaveText('삼성')
    await expect(playerButton(page, '디아즈')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('TC-12 검색 결과 없음', async ({ page }) => {
    await page.locator('.search-box').fill('없는선수zz')
    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
  })
})
