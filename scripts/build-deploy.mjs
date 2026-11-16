//20241476-김도훈-(2026-11-16)
// 배포용 빌드: 선수 사진 원본(<미디어 폴더>/players)으로 최적화 WebP(media-build/players)를 다시 만들고,
// npm run build 뒤에 그 최적화 파일만 dist/players로 복사한다. 원본 JPEG는 배포에 넣지 않는다.
// 사진은 공개 저장소에 없으므로 이 명령을 돌리는 컴퓨터에 원본 폴더가 있어야 한다.
// 폴더는 KBO_MEDIA_DIR(.env.local)로 정하고, 없으면 ../kbo-cheer-web-media를 본다. 실행: npm run build:deploy
import { spawnSync } from 'node:child_process'
import { cp, readdir, stat } from 'node:fs/promises'
import { optimizePlayerMedia } from './optimize-player-media.mjs'

let optimized
try {
  optimized = await optimizePlayerMedia()
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e))
  console.error('배포 전이라 빌드도 하지 않았습니다.')
  process.exit(1)
}
if ((await readdir(optimized.out)).length === 0) {
  console.error(`최적화한 사진이 없습니다: ${optimized.out}`)
  process.exit(1)
}

// 사진을 함께 올리는 빌드라 앱이 사진을 요청하게 한다(vite.config.ts의 __PLAYER_PHOTOS__)
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, KBO_PLAYER_PHOTOS: '1' } })
if (build.status !== 0) process.exit(build.status ?? 1)

let copied = 0
await cp(optimized.out, 'dist/players', {
  recursive: true,
  filter: async (file) => {
    if ((await stat(file)).isDirectory()) return true
    const ok = file.endsWith('.webp')
    if (ok) copied++
    return ok
  },
})
console.log(`최적화한 선수 사진 ${copied}장을 dist/players로 복사했습니다(${optimized.out})`)
