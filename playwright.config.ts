//20241476-김도훈-(2026-11-15)
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    // 움직임이 끝나기를 기다리며 확인이 흔들리지 않게 동작 줄이기로 돌린다. 옮기기·크기·스프링이 꺼지고 페이드만 남는다
    contextOptions: { reducedMotion: 'reduce' },
    // 재생이 확인된 YouTube 방문자 쿠키만 나눠 쓴다(e2e/global-setup.ts, F-01)
    storageState: 'e2e/.auth/youtube-visitor.json',
    // 추적 파일은 요청 URL을 담아 API 키가 남으므로 끈다
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
