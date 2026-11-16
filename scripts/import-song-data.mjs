//20241476-김도훈-(2026-11-16)
// 미디어 폴더의 data/에 정리해 둔 곡 데이터를 저장소의 처음 데이터로 옮긴다.
//   cheer-starts.json   선수곡 응원가 시작 지점 → src/data/seed-songs.json의 cheerStart
//   team-song-ranks.json 팀 응원가 구단 안 인기 순위 → src/data/team-song-ranks.json
// 곡은 (teamId, videoId, start)로 찾고, 맞는 곡이 정확히 하나가 아니면 아무것도 쓰지 않고 멈춘다.
// 앱은 시각을 초 단위 정수로만 다루므로(mm:ss 입력·표시·파일 검사) 응원가 시작은 내림한다.
// 응원가 앞의 1초 안쪽을 조금 더 듣는 쪽이 첫 박을 놓치는 쪽보다 낫다.
// 실행: node --env-file-if-exists=.env.local scripts/import-song-data.mjs (미디어 폴더는 KBO_MEDIA_DIR)
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SEED = 'src/data/seed-songs.json'
const RANKS = 'src/data/team-song-ranks.json'
const dataDir = path.resolve(process.env.KBO_MEDIA_DIR || '../kbo-cheer-web-media', 'data')

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))
const key = (s) => `${s.teamId}|${s.videoId}|${s.start}`

const seedFile = await readJson(SEED)
const cheerStarts = await readJson(path.join(dataDir, 'cheer-starts.json'))
const ranks = await readJson(path.join(dataDir, 'team-song-ranks.json'))

function findOne(entry, kind) {
  const hits = seedFile.songs.filter((s) => key(s) === key(entry) && s.kind === kind)
  if (hits.length !== 1 || hits[0].title !== entry.title) {
    throw new Error(`처음 데이터에서 곡을 하나로 찾지 못했습니다: ${key(entry)} ${entry.title} (${hits.length}곡)`)
  }
  return hits[0]
}

for (const entry of cheerStarts) {
  const song = findOne(entry, 'player')
  const sec = Math.floor(entry.cheerStart)
  if (!(song.start < sec && sec < song.end)) {
    throw new Error(`응원가 시작이 곡 구간 밖입니다: ${entry.title} ${sec} (${song.start}~${song.end})`)
  }
  song.cheerStart = sec
}
for (const entry of ranks) findOne(entry, 'team')

const rankRows = [...ranks]
  .sort((a, b) => a.teamId.localeCompare(b.teamId) || a.rank - b.rank)
  .map(({ teamId, videoId, start, title, rank }) => ({ teamId, videoId, start, title, rank }))

await writeFile(SEED, JSON.stringify(seedFile, null, 2))
await writeFile(RANKS, JSON.stringify(rankRows, null, 1) + '\n')
console.log(`응원가 시작 ${cheerStarts.length}곡 → ${SEED}, 팀 응원가 순위 ${rankRows.length}곡 → ${RANKS}`)
