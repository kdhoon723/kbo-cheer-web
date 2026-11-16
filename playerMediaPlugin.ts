//20241476-김도훈-(2026-11-16)
import { createReadStream, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.webp': 'image/webp' }
const PREFIX = '/players/'

type Next = () => void

/**
 * 개발 서버에서 /players/*를 저장소 밖 사진 폴더(mediaDir/players)에서 내준다.
 * 폴더가 없거나 파일이 없으면 404로 끝내, 화면은 구단 아바타로 내려간다.
 * 사진은 저장소와 public/에 넣지 않는다(배포 빌드 때만 dist/players로 복사, scripts/build-deploy.mjs)
 */
export function playerMedia(mediaDir: string | undefined): Plugin {
  const root = mediaDir ? path.resolve(mediaDir, 'players') : null

  function handle(req: IncomingMessage, res: ServerResponse, next: Next) {
    const url = req.url ?? ''
    if (!url.startsWith(PREFIX)) return next()
    const notFound = () => {
      res.statusCode = 404
      res.end()
    }
    let relative: string
    try {
      relative = decodeURIComponent(url.slice(PREFIX.length).split('?')[0] ?? '')
    } catch {
      return notFound()
    }
    const type = TYPES[path.extname(relative)]
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
