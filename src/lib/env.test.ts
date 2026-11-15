//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { isIOS } from './env.ts'

const nav = (userAgent: string, platform: string, maxTouchPoints: number) => ({ userAgent, platform, maxTouchPoints })

describe('isIOS', () => {
  it('userAgent에 iPhone, iPad, iPod가 있으면 iOS다', () => {
    expect(isIOS(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5))).toBe(true)
    expect(isIOS(nav('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'iPad', 5))).toBe(true)
    expect(isIOS(nav('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)', 'iPod', 5))).toBe(true)
  })

  it('데스크톱 모드 아이패드(MacIntel + 터치 2개 이상)도 iOS다', () => {
    expect(isIOS(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5))).toBe(true)
  })

  it('맥, 윈도우, 안드로이드는 iOS가 아니다', () => {
    expect(isIOS(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0))).toBe(false)
    expect(isIOS(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0))).toBe(false)
    expect(isIOS(nav('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 'Linux armv8l', 5))).toBe(false)
  })
})
