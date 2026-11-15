//20241476-김도훈-(2026-11-15)

let counter = 0

export function createSongId(): string {
  counter += 1
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 8)
}
