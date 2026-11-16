//20241476-김도훈-(2026-11-16)
// 배포용 빌드: npm run build 뒤에 선수 사진 폴더(<미디어 폴더>/players)를 dist/players로 복사한다.
// 사진은 공개 저장소에 없으므로 이 명령을 돌리는 컴퓨터에 폴더가 있어야 한다.
// 폴더는 KBO_MEDIA_DIR(.env.local)로 정하고, 없으면 ../kbo-cheer-web-media를 본다. 실행: npm run build:deploy
import { spawnSync } from 'node:child_process'
import { cp, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const mediaDir = path.resolve(process.env.KBO_MEDIA_DIR || '../kbo-cheer-web-media')
const source = path.join(mediaDir, 'players')

const found = await stat(source).catch(() => null)
if (!found?.isDirectory()) {
  console.error(`선수 사진 폴더를 찾을 수 없습니다: ${source}`)
  console.error('KBO_MEDIA_DIR(.env.local)에 사진 폴더 위치를 적거나 ../kbo-cheer-web-media에 폴더를 두세요. 배포 전이라 빌드도 하지 않았습니다.')
  process.exit(1)
}
if ((await readdir(source)).length === 0) {
  console.error(`선수 사진 폴더가 비어 있습니다: ${source}`)
  process.exit(1)
}

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

const IMAGE = /\.(jpg|webp)$/
let copied = 0
await cp(source, 'dist/players', {
  recursive: true,
  filter: async (file) => {
    if ((await stat(file)).isDirectory()) return true
    const ok = IMAGE.test(file)
    if (ok) copied++
    return ok
  },
})
console.log(`선수 사진 ${copied}장을 dist/players로 복사했습니다(${source})`)
