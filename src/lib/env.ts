//20241476-김도훈-(2026-11-15)

// YouTube Data API 키의 HTTP 리퍼러 제한과 같은 목록이다. 둘 중 하나만 바꾸면 키가 거절되거나 버튼이 꺼진다
export const DATA_API_ORIGINS: readonly string[] = [
  'https://kbocheer.kdhoon.me',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

export function isDataApiOrigin(origin: string): boolean {
  return DATA_API_ORIGINS.includes(origin)
}

export interface NavigatorLike {
  userAgent: string
  platform: string
  maxTouchPoints: number
}

// 아이패드 데스크톱 모드는 userAgent가 Mac과 같아서 터치 지점 수로 구분한다
export function isIOS(nav: NavigatorLike = navigator): boolean {
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
}
