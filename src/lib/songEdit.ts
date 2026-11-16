//20241476-김도훈-(2026-11-16)
import type { SongFormValues } from '../types.ts'
import { formatTime, parseTime } from './time.ts'

/** 시각 칸 글자를 delta초 옮긴다. 0 ~ max 안으로 자르고, 읽을 수 없는 글자면 그대로 둔다 */
export function stepTimeText(text: string, delta: number, max: number): string {
  const sec = parseTime(text)
  if (sec === null) return text
  return formatTime(Math.min(max, Math.max(0, sec + delta)))
}

/** 「지금 위치로」에 넣을 초. 재생 위치를 정수 초로 내린다 */
export function positionText(t: number): string {
  return formatTime(Math.max(0, Math.floor(t)))
}

/** 저장할 것이 있는가. 앞뒤 공백과 같은 시각의 다른 표기(7:00과 07:00)는 바뀐 것으로 보지 않는다 */
export function isFormDirty(initial: SongFormValues, values: SongFormValues): boolean {
  const time = (s: string) => parseTime(s) ?? s.trim()
  return (
    initial.title.trim() !== values.title.trim() ||
    initial.kind !== values.kind ||
    time(initial.startText) !== time(values.startText) ||
    time(initial.endText) !== time(values.endText) ||
    (values.kind === 'player' && time(initial.cheerStartText) !== time(values.cheerStartText))
  )
}

export type PreviewFrom = 'start' | 'cheer' | 'last5'

export const PREVIEW_LAST_SEC = 5

/** 미리 듣기를 시작할 초. 응원가 시작이 없으면 null, 끝 5초 전이 시작보다 앞이면 시작부터 */
export function previewStart(from: PreviewFrom, start: number, end: number, cheerStart: number | null): number | null {
  if (from === 'start') return start
  if (from === 'cheer') return cheerStart
  return Math.max(start, end - PREVIEW_LAST_SEC)
}

/** 그 시각부터 YouTube에서 여는 주소 */
export function youtubeAt(videoId: string, sec: number): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.max(0, Math.floor(sec))}s`
}

/** 구간 막대에서 sec가 놓일 비율(0~1). 구간이 없으면 0 */
export function segmentRatio(sec: number, start: number, end: number): number {
  if (end <= start) return 0
  return Math.min(1, Math.max(0, (sec - start) / (end - start)))
}
