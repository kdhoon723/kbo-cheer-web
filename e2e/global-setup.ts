//20241476-김도훈-(2026-11-16)
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from '@playwright/test'

export const YOUTUBE_STATE = 'e2e/.auth/youtube-visitor.json'

/**
 * F-01: 쿠키가 없는 새 방문자는 가끔 YouTube 영상 서버가 영상 대신 "증명 필요"(StreamProtectionStatus 3)만
 * 돌려주고, 그 방문자는 같은 세션 안에서 다시 시도해도 계속 막힌다. 실제 사용자는 같은 브라우저를 계속 쓰므로,
 * 테스트도 재생이 한 번 된 방문자의 YouTube 쿠키를 모든 테스트에 나눠 쓴다. 앱의 LocalStorage는 넣지 않는다
 */
export default async function globalSetup(): Promise<void> {
  const browser = await chromium.launch()
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const context = await browser.newContext({ reducedMotion: 'reduce' })
      const page = await context.newPage()
      await page.goto('http://localhost:5173/team/hanwha')
      await page.waitForFunction(() => typeof window.YT?.get?.('yt-player')?.getPlayerState === 'function', null, {
        timeout: 20_000,
      })
      await page.locator('.player-grid button').first().click()
      const played = await page
        .waitForFunction(() => window.YT?.get?.('yt-player')?.getPlayerState() === 1, null, { timeout: 8_000 })
        .then(() => true)
        .catch(() => false)
      if (played) {
        const { cookies } = await context.storageState()
        mkdirSync(dirname(YOUTUBE_STATE), { recursive: true })
        writeFileSync(YOUTUBE_STATE, JSON.stringify({ cookies, origins: [] }))
        await context.close()
        return
      }
      await context.close()
    }
    throw new Error('재생이 되는 YouTube 방문자 쿠키를 5번 안에 만들지 못했습니다')
  } finally {
    await browser.close()
  }
}
