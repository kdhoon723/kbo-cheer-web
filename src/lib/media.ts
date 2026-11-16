//20241476-김도훈-(2026-11-16)
import { withVersion } from './mediaVersion.ts'

const PHOTOS_VERSION: string | null = __PLAYER_PHOTOS__
const LYRICS_VERSION: string | null = __LYRICS__

/**
 * 이 빌드에 선수 사진 파일이 있는가. 개발 서버는 media-build/players가 있을 때, 빌드는 npm run build:deploy일 때만 true다.
 * false면 사진 주소를 아예 요청하지 않고 구단 아바타를 바로 쓴다(사진 없는 소스로 실행할 때 404가 쌓이지 않게)
 */
export const PLAYER_PHOTOS: boolean = PHOTOS_VERSION !== null

/** 이 빌드에 가사 파일(팀별 /lyrics/<팀ID>.json)이 있는가. 사진과 같은 규칙이고, false면 가사를 요청하지 않고 가사 칸도 두지 않는다 */
export const LYRICS: boolean = LYRICS_VERSION !== null

/** 사진 주소에 사진 묶음 버전을 붙인다. 사진을 다시 만들어 배포하면 주소가 바뀌어 예전 그림이 남지 않는다 [STEP 3-㉚] */
export function photoSrc(url: string): string {
  return withVersion(url, PHOTOS_VERSION)
}

/** 가사 주소에 가사 묶음 버전을 붙인다. 형식이 바뀐 가사를 배포해도 캐시의 예전 파일을 읽지 않는다 [STEP 3-㉚] */
export function lyricsSrc(url: string): string {
  return withVersion(url, LYRICS_VERSION)
}
