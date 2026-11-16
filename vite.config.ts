//20241476-김도훈-(2026-11-15)
import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { playerMedia } from './playerMediaPlugin.ts'

const MEDIA_OUT = 'media-build'

// API 키 리퍼러 제한이 localhost:5173 기준이라 포트를 고정하고, 휴대폰 접속을 위해 LAN에도 연다
// 사진 파일이 있는 빌드에서만 사진을 요청한다. 개발 서버는 media-build/players가 있으면, 빌드는 build:deploy가
// KBO_PLAYER_PHOTOS=1을 줄 때만이다. 사진 없는 소스로 실행하면 요청 없이 바로 구단 아바타를 쓴다
function playerPhotos(command: 'build' | 'serve'): boolean {
  const forced = process.env.KBO_PLAYER_PHOTOS
  if (forced !== undefined) return forced === '1'
  return command === 'serve' && existsSync(`${MEDIA_OUT}/players`)
}

export default defineConfig(({ command }) => ({
  // 선수 사진은 원본이 아니라 npm run media가 만든 최적화 파일(media-build/players, 저장소에 올리지 않음)을 내준다
  plugins: [react(), playerMedia(MEDIA_OUT)],
  define: { __PLAYER_PHOTOS__: JSON.stringify(playerPhotos(command)) },
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
