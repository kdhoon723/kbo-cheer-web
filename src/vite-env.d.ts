/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 선수 사진 파일이 있는 빌드인가(vite.config.ts의 define, src/lib/media.ts) */
declare const __PLAYER_PHOTOS__: boolean

/** 가사 파일이 있는 빌드인가(vite.config.ts의 define, src/lib/media.ts) */
declare const __LYRICS__: boolean
