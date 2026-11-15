//20241476-김도훈-(2026-11-15)
import type { NowPlaying, Song } from '../types.ts'

export const SEEK_GUARD_MS = 1500

const CANNOT_PLAY = '이 곡을 재생할 수 없습니다'
const EMBED_BLOCKED = CANNOT_PLAY + '(퍼가기가 막힌 영상입니다)'

const ERROR_MESSAGES = new Map<number, string>([
  [2, CANNOT_PLAY + '(영상 주소가 잘못됐습니다)'],
  [5, CANNOT_PLAY + '(브라우저 재생 오류)'],
  [100, CANNOT_PLAY + '(영상이 삭제됐거나 비공개입니다)'],
  [101, EMBED_BLOCKED],
  [150, EMBED_BLOCKED],
  [153, '재생 정보를 확인하지 못했습니다(페이지 설정 문제)'],
])

export function playerErrorMessage(code: number): string {
  return ERROR_MESSAGES.get(code) ?? CANNOT_PLAY
}

/** 응원가로 이동할 시각. 최신 곡의 지점이 재생을 시작한 구간 안에 있을 때만 값이 있다 */
export function cheerTarget(song: Song | undefined, seg: NowPlaying | null): number | null {
  if (!seg || song?.kind !== 'player' || song.cheerStart === null) return null
  return seg.start < song.cheerStart && song.cheerStart < seg.end ? song.cheerStart : null
}

/** 지금 위치를 응원가 시작으로 저장할 초. 선수 곡이고 시작 < 초 < 끝일 때만 값이 있다 */
export function cheerHereSecond(song: Song | undefined, t: number | null): number | null {
  if (t === null || song?.kind !== 'player') return null
  const sec = Math.floor(t)
  return song.start < sec && sec < song.end ? sec : null
}

/** 불러오기·이동 직후 getCurrentTime()이 돌려주는 이동 전 위치인가 */
export function isStalePosition(t: number, seg: Pick<NowPlaying, 'start' | 'end'>, msSinceSeek: number): boolean {
  return msSinceSeek < SEEK_GUARD_MS && (t < seg.start - 1 || t > seg.end + 1)
}

/** 불러오기·이동 직후 플레이어가 이전 로드에서 남은 ENDED·PAUSED를 보낸 것인가(이 곡의 끝 근처가 아니면 무시한다) */
export function isLeftoverStop(t: number, seg: Pick<NowPlaying, 'end'>, msSinceSeek: number): boolean {
  return msSinceSeek < SEEK_GUARD_MS && t < seg.end - 1
}
