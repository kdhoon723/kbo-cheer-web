//20241476-김도훈-(2026-11-16)
// npm run media: 저장소 밖 미디어 폴더(KBO_MEDIA_DIR, 없으면 ../kbo-cheer-web-media)에서
// 선수 사진 WebP(media-build/players)와 팀별 가사(media-build/lyrics)를 만든다. 둘 다 저장소에 올리지 않는다
import { buildLyrics } from './build-lyrics.mjs'
import { optimizePlayerMedia } from './optimize-player-media.mjs'

const kb = (n) => (n / 1024).toFixed(1)

const photos = await optimizePlayerMedia()
for (const kind of ['thumb', 'card', 'cutout']) {
  const [count, bytes] = photos.totals[kind]
  console.log(`${kind}: ${count}장, 합계 ${kb(bytes)} KB, 장당 평균 ${kb(bytes / Math.max(count, 1))} KB`)
}
const all = photos.totals.thumb[1] + photos.totals.card[1] + photos.totals.cutout[1]
console.log(`최적화 파일 합계 ${kb(all)} KB (원본 합계 ${kb(photos.totals.originalBytes)} KB) → ${photos.out}`)

const lyrics = await buildLyrics()
const songs = lyrics.files.reduce((n, f) => n + f.count, 0)
console.log(`가사 ${songs}곡 → ${lyrics.out} (${lyrics.files.map((f) => `${f.teamId} ${f.count}곡 ${kb(f.bytes)} KB`).join(', ')})`)
