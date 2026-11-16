//20241476-김도훈-(2026-11-16)

/**
 * 이 빌드에 선수 사진 파일이 있는가. 개발 서버는 media-build/players가 있을 때, 빌드는 npm run build:deploy일 때만 true다.
 * false면 사진 주소를 아예 요청하지 않고 구단 아바타를 바로 쓴다(사진 없는 소스로 실행할 때 404가 쌓이지 않게)
 */
export const PLAYER_PHOTOS: boolean = __PLAYER_PHOTOS__
