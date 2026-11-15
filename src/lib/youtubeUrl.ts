//20241476-김도훈-(2026-11-15)

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set(['youtube.com', 'm.youtube.com'])

function pickId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '')
  const parts = url.pathname.split('/').filter((p) => p !== '')
  if (host === 'youtu.be') return parts[0] ?? null
  if (!HOSTS.has(host)) return null
  if (url.pathname === '/watch') return url.searchParams.get('v')
  if (parts[0] === 'shorts' || parts[0] === 'embed') return parts[1] ?? null
  return null
}

export function extractVideoId(input: string): string | null {
  const s = input.trim()
  if (s === '') return null
  if (VIDEO_ID.test(s)) return s
  let url: URL
  try {
    url = new URL(s.startsWith('http') ? s : `https://${s}`)
  } catch {
    return null
  }
  const id = pickId(url)
  return id !== null && VIDEO_ID.test(id) ? id : null
}
