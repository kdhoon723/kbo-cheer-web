//20241476-김도훈-(2026-11-16)

/**
 * 옮길 수 있는 끝. 끝 1초 전부터 페이드가 시작되므로(끝 감시), 옮긴 뒤 적어도 1초는 들리게 끝 2초 전까지만 옮긴다
 */
export const SEEK_END_GUARD_SEC = 2

/** 키보드 ←/→ 한 번에 옮기는 초 */
export const SEEK_KEY_STEP_SEC = 5

/** 보간한 위치보다 플레이어가 알려 준 위치가 이만큼 넘게 뒤면 진짜로 뒤로 간 것(옮기기·다시 틀기)이다 */
export const BACKWARD_JUMP_SEC = 1

/**
 * 마지막 위치에서 앞으로 그려 갈 수 있는 최대 초. 버퍼링처럼 위치가 멈췄는데 재생 상태가 그대로일 때
 * 막대가 혼자 앞서 달리지 않게 한다(YouTube는 재생 중 위치를 보통 프레임마다 새로 알려 준다)
 */
export const MAX_EXTRAPOLATE_SEC = 0.6

export interface Segment {
  start: number
  end: number
}

export function seekRange(seg: Segment): { min: number; max: number } {
  return { min: seg.start, max: Math.max(seg.start, seg.end - SEEK_END_GUARD_SEC) }
}

/** 시각 → 막대 비율(0~1) */
export function ratioOf(t: number, seg: Segment): number {
  if (seg.end <= seg.start) return 0
  return Math.min(1, Math.max(0, (t - seg.start) / (seg.end - seg.start)))
}

/** 막대 위 누른 x → 비율(0~1) */
export function pointerRatio(clientX: number, left: number, width: number): number {
  if (width <= 0) return 0
  return Math.min(1, Math.max(0, (clientX - left) / width))
}

/** 비율 → 옮길 시각(옮길 수 있는 범위로 자름) */
export function seekTimeAt(ratio: number, seg: Segment): number {
  const { min, max } = seekRange(seg)
  return Math.min(max, Math.max(min, seg.start + ratio * (seg.end - seg.start)))
}

/** 키보드로 옮길 시각. 다루지 않는 키면 null */
export function keySeekTime(key: string, t: number, seg: Segment): number | null {
  const { min, max } = seekRange(seg)
  const clamp = (x: number) => Math.min(max, Math.max(min, x))
  if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(t - SEEK_KEY_STEP_SEC)
  if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(t + SEEK_KEY_STEP_SEC)
  if (key === 'Home') return min
  if (key === 'End') return max
  return null
}

/** 마지막으로 받은 재생 위치와 받은 때(ms) */
export interface PositionSample {
  t: number
  at: number
}

/**
 * 이번 프레임에 그릴 위치. 재생 중이면 마지막 위치에 그 뒤 흐른 시간을 더한다.
 * 새로 받은 위치가 조금 뒤(BACKWARD_JUMP_SEC 이하)면 앞으로 그린 값에 머물러 막대가 뒤로 튀지 않게 하고,
 * 그보다 많이 뒤면 진짜로 뒤로 간 것이라 따라간다
 */
export function nextShownTime(prevShown: number | null, sample: PositionSample, now: number, playing: boolean): number {
  const ahead = Math.min(MAX_EXTRAPOLATE_SEC, Math.max(0, now - sample.at) / 1000)
  const predicted = playing ? sample.t + ahead : sample.t
  if (prevShown === null || predicted >= prevShown) return predicted
  return prevShown - predicted > BACKWARD_JUMP_SEC ? predicted : prevShown
}
