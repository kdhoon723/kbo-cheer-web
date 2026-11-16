//20241476-김도훈-(2026-11-15)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { playerMedia } from './playerMediaPlugin.ts'
import { mediaVersion } from './src/lib/mediaVersion.ts'

const MEDIA_OUT = 'media-build'

// API 키 리퍼러 제한이 localhost:5173 기준이라 포트를 고정하고, 휴대폰 접속을 위해 LAN에도 연다
// 사진·가사 파일이 있는 빌드에서만 그것을 요청한다. 개발 서버는 media-build/players(lyrics)가 있으면, 빌드는 build:deploy가
// KBO_PLAYER_PHOTOS=1(KBO_LYRICS=1)을 줄 때만이다. 없는 소스로 실행하면 요청 없이 구단 아바타를 쓰고 가사 칸을 두지 않는다
function hasMedia(command: 'build' | 'serve', env: string, folder: string): boolean {
  const forced = process.env[env]
  if (forced !== undefined) return forced === '1'
  return command === 'serve' && existsSync(`${MEDIA_OUT}/${folder}`)
}

/**
 * 사진·가사 묶음의 내용 버전. 파일이 있는 빌드면 media-build/<folder> 전체로 만들고, 없으면 null이다(요청하지 않음).
 * 앱은 주소 뒤에 ?v=<버전>을 붙여, 다시 배포해 내용이 바뀌면 캐시에 남은 예전 파일 대신 새 파일을 받는다 [STEP 3-㉚]
 */
function mediaVersionOf(command: 'build' | 'serve', env: string, folder: string): string | null {
  const root = `${MEDIA_OUT}/${folder}`
  if (!hasMedia(command, env, folder) || !existsSync(root)) return null
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => {
      const full = path.join(d.parentPath, d.name)
      return { path: path.relative(root, full), bytes: readFileSync(full) }
    })
  return files.length > 0 ? mediaVersion(files) : null
}

export default defineConfig(({ command }) => ({
  // 선수 사진과 가사는 원본이 아니라 npm run media가 만든 파일(media-build/players, lyrics, 저장소에 올리지 않음)을 내준다
  plugins: [react(), playerMedia(MEDIA_OUT)],
  define: {
    __PLAYER_PHOTOS__: JSON.stringify(mediaVersionOf(command, 'KBO_PLAYER_PHOTOS', 'players')),
    __LYRICS__: JSON.stringify(mediaVersionOf(command, 'KBO_LYRICS', 'lyrics')),
  },
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
