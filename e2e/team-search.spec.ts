//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import {
  gotoHanwha,
  note,
  nowTitle,
  prevTeamButton,
  teamPicker,
  teamSongs,
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
    await expect(prevTeamButton(page)).toHaveText('⇄ 전 팀')
    await expect(prevTeamButton(page)).toBeDisabled()
  })

  test('TC-02 팀 선택과 선수 격자', async ({ page }) => {
    await page.goto('/')
    await page.locator('.team-grid').getByRole('button', { name: '한화', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    const expected = teamSongs('hanwha', 'player').map((s) => s.title)
    expect(expected.slice(0, 3)).toEqual(['최인호', '페라자', '문현빈'])
    await expect(page.locator('.player-grid button')).toHaveCount(22)
    await expect(page.locator('.player-grid button')).toHaveText(expected)
  })

  test('TC-03 마지막 팀 복원', async ({ page }) => {
    await page.goto('/')
    await page.locator('.team-grid').getByRole('button', { name: '한화', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await page.reload()
    await page.goto('/')
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(page.locator('.player-grid button').first()).toHaveText('최인호')
  })

  test('TC-04 전 팀 전환', async ({ page }) => {
    await gotoHanwha(page)
    await teamPicker(page).selectOption('samsung')
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(prevTeamButton(page)).toHaveText('⇄ 한화')
    await prevTeamButton(page).click()
    await expect(page).toHaveURL(/\/team\/hanwha$/)
    await expect(teamPicker(page)).toHaveValue('hanwha')
    await expect(prevTeamButton(page)).toHaveText('⇄ 삼성')
    await prevTeamButton(page).click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(teamPicker(page)).toHaveValue('samsung')
    await expect(prevTeamButton(page)).toHaveText('⇄ 한화')
  })

  test('TC-05 없는 팀 주소', async ({ page }) => {
    await page.goto('/team/nope')
    await expect(page.getByText('팀을 찾을 수 없습니다')).toBeVisible()
    const link = page.getByRole('link', { name: '처음 화면으로' })
    await expect(link).toHaveAttribute('href', '/')
    await link.click()
    await expect(page.getByRole('heading', { name: '응원할 팀을 고르세요' })).toBeVisible()
  })

  test('TC-06 구단 색과 대비', async ({ page }, testInfo) => {
    const rows: { team: string; background: string; color: string; ratio: number }[] = []
    for (const team of TEAMS) {
      await page.goto(`/team/${team.id}`)
      await expect(teamPicker(page)).toHaveValue(team.id)
      const { background, color } = await page.locator('.app-header').evaluate((el) => {
        const cs = getComputedStyle(el)
        return { background: cs.backgroundColor, color: cs.color }
      })
      const ratio = contrast(parseRgb(background), parseRgb(color))
      rows.push({ team: team.id, background, color, ratio: Number(ratio.toFixed(2)) })
      expect(parseRgb(background), `${team.name} 머리말 배경`).toEqual(hexToRgb(team.color))
      expect(ratio, `${team.name} 대비`).toBeGreaterThanOrEqual(4.5)
    }
    note(testInfo, '머리말 색과 대비', rows)
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
    await page.getByRole('button', { name: '가나다 순' }).click()
    await expect(page.locator('.player-grid button')).toHaveText(byName)
    await page.reload()
    await expect(page.getByRole('button', { name: '가나다 순' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.player-grid button')).toHaveText(byName)
  })

  test('TC-08 상황 버튼·팀 응원가', async ({ page }) => {
    const labels = page.locator('.dock-situations .situation-btn .situation-label')
    await expect(labels).toHaveText(['라인업송', '풀카운트 송', '볼넷 송', '공통 안타 송'])
    const texts = await labels.allInnerTexts()
    expect(new Set(texts).size).toBe(texts.length)
    await expect(page.locator('.team-song-list button')).toHaveCount(18)
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
    await expect(hit).toHaveText('디아즈 [삼성]')
    await hit.click()
    await expect(page).toHaveURL(/\/team\/samsung$/)
    await expect(prevTeamButton(page)).toHaveText('⇄ 한화')
    await expect(page.locator('.search-box')).toHaveValue('')
    await expect(nowTitle(page)).toHaveText('디아즈 · 삼성')
    await expect(page.locator('.player-grid').getByRole('button', { name: '디아즈', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('TC-12 검색 결과 없음', async ({ page }) => {
    await page.locator('.search-box').fill('없는선수zz')
    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
  })
})
