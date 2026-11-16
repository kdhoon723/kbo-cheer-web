//20241476-김도훈-(2026-11-16)
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { apiKeyMissing, note, storedSongs, toast } from './helpers.ts'

const MULTI_URL = 'https://www.youtube.com/watch?v=hWF7dU4-fQU'
const MULTI_ID = 'hWF7dU4-fQU'
const TEAM_COUNTS = ['키움 8', '한화 7', '롯데 9', 'SSG 8', '두산 8', 'NC 8', 'KIA 7', 'LG 7', '삼성 8', 'KT 7']
const TEAM_IDS: Record<string, string> = {
  키움: 'kiwoom', 한화: 'hanwha', 롯데: 'lotte', SSG: 'ssg', 두산: 'doosan', NC: 'nc', KIA: 'kia', LG: 'lg', 삼성: 'samsung', KT: 'kt',
}

async function loadMulti(page: Page) {
  await page.goto('/team/samsung/songs/add')
  test.skip(await apiKeyMissing(page), 'API 키가 없어 가져오기 화면이 비활성')
  await page.getByRole('textbox', { name: 'YouTube 영상 주소' }).fill(MULTI_URL)
  await page.getByRole('button', { name: '불러오기' }).click()
  await expect(page.locator('.review-counts')).toBeVisible({ timeout: 15_000 })
}

function filter(page: Page, name: string) {
  return page.getByRole('group', { name: '후보 거르기' }).getByRole('button', { name: new RegExp(`^${name} \\d+$`) })
}

test.describe('23. 여러 구단 영상과 종류 한꺼번에 바꾸기 [STEP 3-㉖]', () => {
  test('TC-148 여러 구단 안내와 구단별 곡 수, 「삼성 곡만」은 삼성 곡만 고른다 [API]', async ({ page }, testInfo) => {
    await loadMulti(page)
    const notice = page.getByRole('region', { name: '여러 구단 영상' })
    await expect(notice.locator('.team-split-title')).toHaveText('10개 구단 곡이 섞인 영상입니다 · 77곡')
    await expect(notice.locator('.team-split-counts li')).toHaveText(TEAM_COUNTS)
    await expect(notice.getByRole('button', { name: '삼성 곡만' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.review-counts')).toHaveText('새 곡 1 · 이미 있음 7 · 경고 0 · 다른 구단 69')
    // 접두어를 떼고 팀 응원가로 본다. 줄마다 구단 로고
    await expect(page.locator('.candidate-name').first()).toHaveText('승리를 위하여')
    await expect(page.locator('.candidate .logo-plate')).toHaveCount(77)
    await expect(page.locator('.candidate-kind').filter({ hasText: '팀 응원가' })).toHaveCount(77)
    // 고른 곡은 삼성 곡뿐이고, 다른 구단 곡은 고를 수 없다
    await expect(page.locator('.import-summary')).toHaveText('선수 0 · 상황 0 · 팀 응원가 1 / 저장 1곡')
    await expect(page.locator('.candidate').filter({ hasText: '다른 구단(저장 안 함)' })).toHaveCount(69)
    const checked = await page.locator('.candidate').evaluateAll((items) =>
      items
        .filter((li) => li.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
        .map((li) => [li.querySelector('.visually-hidden')?.textContent, li.querySelector('.candidate-name')?.textContent]),
    )
    note(testInfo, '고른 곡', checked)
    expect(checked).toEqual([['삼성', '빅토리 라이온즈']])
    await page.getByRole('button', { name: '전체 선택' }).click()
    await expect(page.getByRole('button', { name: '1곡 저장' })).toBeEnabled()
  })

  test('TC-149 구단별로 나눠 넣으면 각 팀 팀 응원가로 들어가고, 이미 있는 곡은 빠진다 [API]', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    await loadMulti(page)
    const before = await storedSongs(page)
    await page.getByRole('button', { name: '구단별로 나눠 넣기' }).click()
    await expect(page.locator('.review-counts')).toHaveText('새 곡 17 · 이미 있음 60 · 경고 0')
    await expect(page.locator('.import-summary')).toHaveText('선수 0 · 상황 0 · 팀 응원가 17 / 저장 17곡')
    await page.getByRole('button', { name: '17곡 저장' }).click()

    await expect(page).toHaveURL(/\/team\/samsung\/songs\?tab=team$/)
    const text = (await toast(page).textContent()) ?? ''
    note(testInfo, '저장 알림', text)
    expect(text).toMatch(/^17곡을 저장했습니다 · /)
    const after = await storedSongs(page)
    const added = after.filter((s) => s.videoId === MULTI_ID)
    expect(after).toHaveLength(before.length + 17)
    expect(added.every((s) => s.kind === 'team')).toBe(true)
    // 알림의 팀별 수와 실제로 들어간 팀별 수가 같다
    const fromToast = Object.fromEntries(
      [...text.matchAll(/(키움|한화|롯데|SSG|두산|NC|KIA|LG|삼성|KT) (\d+)/g)].map((m) => [TEAM_IDS[m[1]], Number(m[2])]),
    )
    const fromStore: Record<string, number> = {}
    for (const s of added) fromStore[s.teamId] = (fromStore[s.teamId] ?? 0) + 1
    note(testInfo, '팀별로 들어간 곡', fromStore)
    expect(fromToast).toEqual(fromStore)
    // NC 「승리를 위하여」는 NC에 없던 곡이라 들어가고, 이름에 구단이 붙지 않는다
    expect(added.some((s) => s.teamId === 'nc' && s.title === '승리를 위하여')).toBe(true)
    expect(added.some((s) => s.title.includes(' - '))).toBe(false)
    await page.goto('/team/nc/songs?tab=team')
    await expect(page.locator('.song-item').filter({ has: page.getByText('승리를 위하여', { exact: true }) })).toHaveCount(1)

    // 같은 영상을 다시 넣으면 77곡 모두 이미 있음
    await loadMulti(page)
    await page.getByRole('button', { name: '구단별로 나눠 넣기' }).click()
    await expect(page.locator('.review-counts')).toHaveText('새 곡 0 · 이미 있음 77 · 경고 0')
  })

  test('TC-150 고른 12곡만 선수로 바꾸고 판정을 다시 한다 [API]', async ({ page }, testInfo) => {
    await loadMulti(page)
    await page.getByRole('button', { name: '구단별로 나눠 넣기' }).click()
    await page.getByRole('button', { name: '전체 해제' }).click()
    await filter(page, '이미 있음').click()
    // 이미 있는 팀 응원가 12곡을 직접 고른다
    const boxes = page.locator('.candidate input[type="checkbox"]')
    for (let i = 0; i < 12; i++) await boxes.nth(i).check()
    const picked = await page.locator('.candidate-name').evaluateAll((els) => els.slice(0, 12).map((e) => e.textContent))
    const bulk = page.getByRole('group', { name: '바꿀 곡' })
    await expect(bulk.getByRole('button', { name: '고른 곡 12' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: '선수로' }).click()
    await expect(toast(page)).toHaveText(/12곡을 선수로 바꿨습니다/)

    await filter(page, '전체').click()
    const rows = await page.locator('.candidate').evaluateAll((items) =>
      items.map((li) => ({
        kind: li.querySelector('.candidate-kind')?.textContent,
        title: li.querySelector('.candidate-name')?.textContent,
        existing: Array.from(li.querySelectorAll('.badge')).some((b) => b.textContent === '이미 있음'),
      })),
    )
    const players = rows.filter((r) => r.kind === '선수')
    note(testInfo, '선수로 바뀐 곡', players.map((r) => r.title))
    expect(players.map((r) => r.title)).toEqual(picked)
    expect(rows.filter((r) => r.kind === '팀 응원가')).toHaveLength(65)
    // 선수 곡이 되면 같은 이름 팀 응원가 판정이 사라져 새 곡이 된다(이미 있음 60 → 48)
    expect(players.every((r) => !r.existing)).toBe(true)
    await expect(page.locator('.review-counts')).toHaveText('새 곡 29 · 이미 있음 48 · 경고 0')
    await expect(page.locator('.import-summary')).toHaveText('선수 12 · 상황 0 · 팀 응원가 0 / 저장 12곡')
  })

  test('TC-151 펼친 줄은 곡 수정과 같은 칸: 이름표가 위에 있고 칸 폭이 줄마다 같다 [API]', async ({ page }, testInfo) => {
    for (const [width, height, columns] of [[390, 844, 1], [1280, 800, 3]] as const) {
      await page.setViewportSize({ width, height })
      await loadMulti(page)
      await page.locator('.candidate-toggle').nth(0).click()
      await page.locator('.candidate-toggle').nth(1).click()
      const edits = page.locator('.candidate-edit')
      await expect(edits).toHaveCount(2)
      await expect(edits.first().getByRole('group', { name: '종류' }).getByRole('button')).toHaveText(['선수', '상황', '팀 응원가'])
      await expect(edits.first().getByRole('textbox', { name: '이름' })).toHaveValue('승리를 위하여')
      await expect(edits.first().getByRole('textbox', { name: '시작' })).toHaveValue('00:00')
      await expect(edits.first().locator('.field-note')).toHaveText('끝 01:32 · 다음 챕터 시각으로 정합니다')
      const boxes = await edits.evaluateAll((els) =>
        els.map((el) => Array.from(el.querySelectorAll(':scope > .field')).map((f) => {
          const r = f.getBoundingClientRect()
          return [Math.round(r.left), Math.round(r.width)]
        })),
      )
      note(testInfo, `${width} 칸 위치·폭`, boxes)
      expect(boxes[0]).toEqual(boxes[1])
      const lefts = new Set(boxes[0].map(([left]) => left))
      expect(lefts.size).toBe(columns)
      if (columns === 1) expect(new Set(boxes[0].map(([, w]) => w)).size).toBe(1)
    }
  })
})
