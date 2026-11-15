//20241476-김도훈-(2026-11-15)

const CLOCK = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/
const PLAIN_SECONDS = /^\d+$/

export function parseTime(text: string): number | null {
  const s = text.trim()
  if (PLAIN_SECONDS.test(s)) return Number(s)
  const m = CLOCK.exec(s)
  if (!m) return null
  const hours = m[1] === undefined ? null : Number(m[1])
  const minutes = Number(m[2])
  const seconds = Number(m[3])
  if (seconds >= 60) return null
  if (hours !== null && minutes >= 60) return null
  return (hours ?? 0) * 3600 + minutes * 60 + seconds
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
}

const ISO_DURATION = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/

export function parseIsoDuration(s: string): number | null {
  if (s === 'P0D') return 0
  const m = ISO_DURATION.exec(s)
  if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) return null
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}
