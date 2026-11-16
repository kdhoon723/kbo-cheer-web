//20241476-김도훈-(2026-11-15)
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { playerMedia } from './playerMediaPlugin.ts'

const MEDIA_OUT = 'media-build'

// API 키 리퍼러 제한이 localhost:5173 기준이라 포트를 고정하고, 휴대폰 접속을 위해 LAN에도 연다
export default defineConfig(() => ({
  // 선수 사진은 원본이 아니라 npm run media가 만든 최적화 파일(media-build/players, 저장소에 올리지 않음)을 내준다
  plugins: [react(), playerMedia(MEDIA_OUT)],
  server: { port: 5173, strictPort: true, host: true },
  build: {
    rolldownOptions: {
      output: {
        // React 묶음은 앱 코드보다 덜 바뀌므로 따로 둔다. 배포 뒤 앱만 고쳐도 브라우저가 React 파일을 다시 받지 않는다
        codeSplitting: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
  },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
}))
