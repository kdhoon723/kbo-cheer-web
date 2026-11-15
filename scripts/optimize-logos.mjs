//20241476-김도훈-(2026-11-16)
// 구단 엠블럼 원본(assets/teams-original)을 받침 최대 44px의 3배(132px) 안에 맞춘 WebP로 줄여 public/teams에 쓴다.
// 원본보다 크게 늘리지 않는다. 실행: node scripts/optimize-logos.mjs
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'assets/teams-original'
const OUT = 'public/teams'
const MAX = 132

for (const file of (await readdir(SRC)).sort()) {
  const ext = path.extname(file)
  if (ext !== '.png' && ext !== '.svg') continue
  const id = path.basename(file, ext)
  const out = path.join(OUT, `${id}.webp`)
  const input = sharp(path.join(SRC, file), { density: ext === '.svg' ? 300 : 72 })
  const info = await input
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(out)
  const before = (await stat(path.join(SRC, file))).size
  console.log(`${id}: ${before} B -> ${info.size} B (${info.width}x${info.height})`)
}
