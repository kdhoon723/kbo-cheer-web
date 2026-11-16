//20241476-김도훈-(2026-11-16)
// 구단 기본 아바타 원본(assets/avatars-original, 512px)을 256px WebP로 줄여 public/avatars에 쓴다.
// 256px은 지금 쓰는 40×50 자리의 약 6배(3배 화면 기준 2배 여유)이고, 이후 키울 카드(가로 120px대, 2배 화면)에도 선명하다.
// 원본보다 크게 늘리지 않는다. 실행: node scripts/optimize-avatars.mjs
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'assets/avatars-original'
const OUT = 'public/avatars'
const MAX = 256

await mkdir(OUT, { recursive: true })
for (const file of (await readdir(SRC)).sort()) {
  if (path.extname(file) !== '.png') continue
  const id = path.basename(file, '.png')
  const info = await sharp(path.join(SRC, file))
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, `${id}.webp`))
  const before = (await stat(path.join(SRC, file))).size
  console.log(`${id}: ${before} B -> ${info.size} B (${info.width}x${info.height})`)
}
