//20241476-김도훈-(2026-11-15)

export function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
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
