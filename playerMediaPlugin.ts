//20241476-김도훈-(2026-11-16)
import { createReadStream, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'

// 주소 앞부분 → mediaDir 아래 폴더와 내줄 수 있는 확장자
const ROUTES: { prefix: string; folder: string; types: Record<string, string> }[] = [
  { prefix: '/players/', folder: 'players', types: { '.jpg': 'image/jpeg', '.webp': 'image/webp' } },
  { prefix: '/lyrics/', folder: 'lyrics', types: { '.json': 'application/json; charset=utf-8' } },
]

type Next = () => void

/**
 * 개발 서버에서 /players/*와 /lyrics/*를 npm run media가 만든 폴더(mediaDir/players, mediaDir/lyrics)에서 내준다.
 * 폴더가 없거나 파일이 없으면 404로 끝내, 화면은 구단 아바타로 내려가고 가사 칸은 생기지 않는다.
 * 사진과 가사는 저장소와 public/에 넣지 않는다(배포 빌드 때만 dist/로 복사, scripts/build-deploy.mjs)
 */
export function playerMedia(mediaDir: string | undefined): Plugin {
  function handle(req: IncomingMessage, res: ServerResponse, next: Next) {
    const url = req.url ?? ''
    const route = ROUTES.find((r) => url.startsWith(r.prefix))
    if (!route) return next()
    const root = mediaDir ? path.resolve(mediaDir, route.folder) : null
    const notFound = () => {
      res.statusCode = 404
      res.end()
    }
    let relative: string
    try {
      relative = decodeURIComponent(url.slice(route.prefix.length).split('?')[0] ?? '')
    } catch {
      return notFound()
    }
    const type = route.types[path.extname(relative)]
    if (!root || !type) return notFound()
    const file = path.resolve(root, relative)
    if (!file.startsWith(root + path.sep)) return notFound()
    try {
      if (!statSync(file).isFile()) return notFound()
    } catch {
      return notFound()
    }
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 'no-cache')
    createReadStream(file).pipe(res)
  }

  return {
    name: 'player-media',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  }
}
