//20241476-김도훈-(2026-11-15)

export function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

export function toChosung(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    out += code >= 0xac00 && code <= 0xd7a3 ? CHOSUNG[Math.floor((code - 0xac00) / 588)] : ch
  }
  return out
}

export function isChosungOnly(q: string): boolean {
  if (q === '') return false
  for (const ch of q) {
    const code = ch.charCodeAt(0)
    if (code < 0x3131 || code > 0x314e) return false
  }
  return true
}
