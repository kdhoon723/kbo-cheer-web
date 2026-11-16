//20241476-김도훈-(2026-11-16)
// 선수 사진 원본(<미디어 폴더>/players, 저장소 밖)을 쓰는 자리에 맞는 WebP로 줄여 media-build/players에 쓴다.
// 원본은 건드리지 않고, 결과 폴더는 .gitignore로 저장소에 올리지 않는다. 개발 서버와 배포 빌드가 이 폴더만 쓴다.
//   <팀>/<ID>.webp         격자·검색·재생 줄(40×50, 보드 48×60)용 120×150. 휴대폰 3배 화면의 40×50과 같다
//   <팀>/card/<ID>.webp    선수 카드 사진(96×120)용 240×300. 2.5배
//   <팀>/cutout/<ID>.webp  선수 카드 누끼(높이 140)용 높이 420 이하, 투명 배경 유지
// 원본보다 크게 늘리지 않는다. 실행: npm run media(scripts/media.mjs, 미디어 폴더는 KBO_MEDIA_DIR, 없으면 ../kbo-cheer-web-media)
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const MEDIA_OUT = 'media-build'

const SIZES = {
  thumb: { width: 120, height: 150 },
  card: { width: 240, height: 300 },
  cutoutHeight: 420,
}

export async function optimizePlayerMedia(mediaDir = process.env.KBO_MEDIA_DIR || '../kbo-cheer-web-media') {
  const source = path.resolve(mediaDir, 'players')
  if (!(await stat(source).catch(() => null))?.isDirectory()) {
    throw new Error(`선수 사진 폴더를 찾을 수 없습니다: ${source} (KBO_MEDIA_DIR을 .env.local에 적으세요)`)
  }
  const out = path.join(MEDIA_OUT, 'players')
  await rm(out, { recursive: true, force: true })
  const totals = { thumb: [0, 0], card: [0, 0], cutout: [0, 0], originalBytes: 0 }
  const add = (kind, bytes) => {
    totals[kind][0]++
    totals[kind][1] += bytes
  }
  for (const team of (await readdir(source)).sort()) {
    const teamDir = path.join(source, team)
    if (!(await stat(teamDir)).isDirectory()) continue
    await mkdir(path.join(out, team, 'card'), { recursive: true })
    await mkdir(path.join(out, team, 'cutout'), { recursive: true })
    for (const file of (await readdir(teamDir)).sort()) {
      if (path.extname(file) !== '.jpg') continue
      const id = path.basename(file, '.jpg')
      const src = path.join(teamDir, file)
      totals.originalBytes += (await stat(src)).size
      // 원본이 이미 4:5라 cover로 잘라도 잘리는 곳이 없다. 4:5가 아닌 사진이 들어와도 늘어나지 않고 위쪽을 기준으로 자른다
      const thumb = await sharp(src)
        .resize({ ...SIZES.thumb, fit: 'cover', position: 'top', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(out, team, `${id}.webp`))
      add('thumb', thumb.size)
      const card = await sharp(src)
        .resize({ ...SIZES.card, fit: 'cover', position: 'top', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(out, team, 'card', `${id}.webp`))
      add('card', card.size)
    }
    const cutoutDir = path.join(teamDir, 'cutout')
    if (!(await stat(cutoutDir).catch(() => null))?.isDirectory()) continue
    for (const file of (await readdir(cutoutDir)).sort()) {
      if (path.extname(file) !== '.webp') continue
      const src = path.join(cutoutDir, file)
      totals.originalBytes += (await stat(src)).size
      const info = await sharp(src)
        .resize({ height: SIZES.cutoutHeight, withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90 })
        .toFile(path.join(out, team, 'cutout', file))
      add('cutout', info.size)
    }
  }
  return { out, totals }
}
