//20241476-김도훈-(2026-11-15)
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { note, seedSong } from './helpers.ts'

const NOH = seedSong('hanwha', '노시환')

const PAGES: { name: string; path: string; ready: (page: Page) => Promise<void> }[] = [
  {
    name: '메인',
    path: '/team/hanwha',
    ready: (page) => expect(page.locator('.player-grid button').first()).toBeVisible(),
  },
  {
    name: '곡 관리',
    path: '/team/hanwha/songs',
    ready: (page) => expect(page.locator('.song-row').first()).toBeVisible(),
  },
  {
    name: '곡 수정',
    path: `/team/hanwha/songs/${NOH.id}/edit`,
    ready: (page) => expect(page.locator('.song-form')).toBeVisible(),
  },
  {
    name: '가져오기',
    path: '/team/hanwha/import',
    ready: (page) => expect(page.getByRole('heading', { name: /^곡 가져오기/ })).toBeVisible(),
  },
  {
    name: '설정',
    path: '/settings',
    ready: (page) => expect(page.getByRole('heading', { name: '설정' })).toBeVisible(),
  },
]

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 768, height: 900 },
  { width: 1280, height: 800 },
]

test.describe('10. 반응형', () => {
  test('TC-57 가로 넘침·버튼 크기', async ({ page }, testInfo) => {
    const failures: string[] = []
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp)
      for (const target of PAGES) {
        await page.goto(target.path)
        await target.ready(page)
        await page.waitForTimeout(200)
        const m = await page.evaluate(() => {
          const doc = document.documentElement
          const small: { what: string; w: number; h: number }[] = []
          let checked = 0
          for (const el of document.querySelectorAll('button, a[href], select, input')) {
            // 체크박스와 슬라이더는 44px 줄 안에 놓여 줄 전체가 눌리는 영역이다
            if (el instanceof HTMLInputElement && ['checkbox', 'range', 'hidden'].includes(el.type)) continue
            if (!el.checkVisibility({ visibilityProperty: true })) continue
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            checked++
            if (r.width < 44 || r.height < 44) {
              const label = (el.textContent ?? '').trim() || el.getAttribute('aria-label') || el.getAttribute('type') || ''
              small.push({ what: `${el.tagName.toLowerCase()} "${label.slice(0, 20)}"`, w: Math.round(r.width), h: Math.round(r.height) })
            }
          }
          return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, checked, small }
        })
        const where = `${vp.width}px ${target.name}`
        note(testInfo, where, { scrollWidth: m.scrollWidth, clientWidth: m.clientWidth, checked: m.checked, small: m.small })
        if (m.scrollWidth !== m.clientWidth) failures.push(`${where}: 가로 넘침 ${m.scrollWidth} > ${m.clientWidth}`)
        for (const s of m.small) failures.push(`${where}: ${s.what} ${s.w}×${s.h}`)
      }
    }
    expect(failures).toEqual([])
  })
})
