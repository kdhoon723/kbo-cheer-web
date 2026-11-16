//20241476-김도훈-(2026-11-16)

/**
 * 사진·가사 파일 묶음의 버전 [STEP 3-㉚]. 이름이 고정인 파일(/lyrics/<팀>.json, /players/…)은 다시 배포해도 브라우저가
 * 캐시에 남은 예전 파일을 쓴다. 빌드할 때 묶음 내용으로 버전을 만들어 앱 JS에 넣고 주소 뒤에 ?v=<버전>을 붙이면,
 * 내용이 바뀐 배포에서만 주소가 바뀌어 새 파일을 받는다. 앱 JS는 이름에 해시가 붙어 있어 버전도 함께 새것이 된다
 */

// FNV-1a 32비트. 암호용이 아니라 내용이 바뀌었는지 알아보는 데만 쓴다
function fnv1a(bytes: Uint8Array, hash: number): number {
  let h = hash
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

export interface MediaFile {
  /** 묶음 폴더 안 상대 경로 */
  path: string
  bytes: Uint8Array
}

/** 파일 묶음의 버전(16진수 8자리). 경로 순으로 경로와 내용을 이어 셈하므로 넘겨준 순서와 상관없고, 내용·이름이 바뀌면 달라진다 */
export function mediaVersion(files: readonly MediaFile[]): string {
  const encoder = new TextEncoder()
  let h = 0x811c9dc5
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    h = fnv1a(encoder.encode(`${f.path}\0`), h)
    h = fnv1a(f.bytes, h)
    h = fnv1a(encoder.encode('\0'), h)
  }
  return h.toString(16).padStart(8, '0')
}

/** 주소 뒤에 버전을 붙인다. 버전이 없으면(파일 없는 빌드) 그대로 */
export function withVersion(url: string, version: string | null): string {
  return version ? `${url}?v=${version}` : url
}
