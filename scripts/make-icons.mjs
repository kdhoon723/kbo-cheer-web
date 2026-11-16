//20241476-김도훈-(2026-11-16)
// KBO 공식 CI 원본(assets/kbo-original)으로 탭 아이콘과 홈 화면 아이콘을 만든다. 실행: node scripts/make-icons.mjs
// 남색 심볼은 어두운 탭 바탕에서 보이지 않아 로고 판과 같은 밝은 판(#ECE7DD) 위에 둔다.
// 16·32px 탭 아이콘은 글자가 읽히지 않아 심볼만, 180px 홈 화면 아이콘은 심볼 + KBO 글자다.
import { stat } from 'node:fs/promises'
import sharp from 'sharp'

const PLATE = '#ECE7DD'
const SYMBOL = 'assets/kbo-original/kbo-ci-symbol.png'
const SIGNATURE = 'assets/kbo-original/kbo-ci-signature.png'

// size: 아이콘 한 변, inset: 판 가장자리와 그림 사이, radius: 판 모서리(아이폰은 스스로 둥글게 깎아 0)
const ICONS = [
  { file: 'public/favicon-16.png', src: SYMBOL, size: 16, inset: 1, radius: 2 },
  { file: 'public/favicon-32.png', src: SYMBOL, size: 32, inset: 3, radius: 4 },
  { file: 'public/apple-touch-icon.png', src: SIGNATURE, size: 180, inset: 22, radius: 0 },
]

for (const { file, src, size, inset, radius } of ICONS) {
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${PLATE}"/></svg>`,
  )
  const box = size - inset * 2
  const art = await sharp(src).resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const info = await sharp(plate)
    .composite([{ input: art, top: inset, left: inset }])
    .png({ compressionLevel: 9 })
    .toFile(file)
  console.log(`${file}: ${info.width}x${info.height}, ${(await stat(file)).size} B`)
}
