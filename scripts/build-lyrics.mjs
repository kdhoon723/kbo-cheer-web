//20241476-김도훈-(2026-11-16)
// 가사 원본(<미디어 폴더>/data/lyrics.json, format 2, 저장소 밖)을 팀별 파일 media-build/lyrics/<팀>.json으로 나눈다.
// 가사는 구단 공식 사이트와 나무위키(CC BY-NC-SA 2.0 KR)에서 옮긴 것이라 선수 사진과 같이 공개 저장소와 public/에 넣지 않는다.
// 곡은 녹음이 아니라 (팀, 구분, key)로 찾는다. 구분은 선수 곡이 player, 상황·팀 응원가가 song이다.
// 앱은 곡을 처음 틀 때 그 팀 파일 하나만 받는다.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { MEDIA_OUT } from './optimize-player-media.mjs'

const TEAMS = ['kiwoom', 'hanwha', 'lotte', 'ssg', 'doosan', 'nc', 'kia', 'lg', 'samsung', 'kt']

export async function buildLyrics(mediaDir = process.env.KBO_MEDIA_DIR || '../kbo-cheer-web-media') {
  const source = path.resolve(mediaDir, 'data', 'lyrics.json')
  let data
  try {
    data = JSON.parse(await readFile(source, 'utf8'))
  } catch {
    throw new Error(`가사 파일을 읽을 수 없습니다: ${source} (KBO_MEDIA_DIR을 .env.local에 적으세요)`)
  }
  if (data?.format !== 2 || !Array.isArray(data.songs)) throw new Error(`가사 파일 형식이 다릅니다(format 2가 아님): ${source}`)
  const out = path.join(MEDIA_OUT, 'lyrics')
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })
  const files = []
  for (const teamId of TEAMS) {
    const songs = data.songs
      .filter((r) => r.teamId === teamId && typeof r.lyrics === 'string' && r.lyrics.trim() !== '')
      .map(({ kind, key, title, lyrics, source, sourceName }) => ({ kind, key, title, lyrics, source, sourceName }))
    const text = JSON.stringify({ teamId, songs })
    await writeFile(path.join(out, `${teamId}.json`), text)
    files.push({ teamId, count: songs.length, bytes: Buffer.byteLength(text) })
  }
  return { out, files }
}
