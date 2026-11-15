//20241476-김도훈-(2026-11-15)

export function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}
