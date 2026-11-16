/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 선수 사진 묶음의 내용 버전. 사진 파일이 없는 빌드면 null(vite.config.ts의 define, src/lib/media.ts) */
declare const __PLAYER_PHOTOS__: string | null

/** 가사 묶음의 내용 버전. 가사 파일이 없는 빌드면 null(vite.config.ts의 define, src/lib/media.ts) */
declare const __LYRICS__: string | null
