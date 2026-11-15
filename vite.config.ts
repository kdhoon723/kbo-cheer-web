//20241476-김도훈-(2026-11-15)
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// API 키 리퍼러 제한이 localhost:5173 기준이라 포트를 고정하고, 휴대폰 접속을 위해 LAN에도 연다
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, host: true },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
