//20241476-김도훈-(2026-11-16)
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { keySeekTime, nextShownTime, pointerRatio, ratioOf, seekTimeAt } from '../lib/progress.ts'
import type { PositionSample, Segment } from '../lib/progress.ts'
import { formatTime } from '../lib/time.ts'

// 옮긴 곳에서 이 안의 위치가 오면 옮기기가 끝난 것이다. 그때까지 최대 SEEK_WAIT_MS 기다린다
const SEEK_SETTLE_SEC = 1.5
const SEEK_WAIT_MS = 1500

interface Props {
  /** 그릴 곡 구간. 곡이 없으면 null */
  seg: Segment | null
  /** 응원가 시작(초). 구간 안일 때만 눈금 */
  cheerAt: number | null
  /** 플레이어가 이 구간을 들고 있는가(재생·준비·일시정지·멈추는 중). 아니면 막대는 0이다 */
  live: boolean
  /** 재생 중이라 앞으로 그려 가도 되는가. 일시정지·멈추는 중이면 받은 위치 그대로 */
  running: boolean
  getCurrentTime: () => number | null
  /** 지금 경과(정수 초). 화면 읽기용 값 */
  elapsed: number
  /** 있으면 눌러서·끌어서·키보드로 옮긴다(넓은 화면 막대와 지금 재생 시트) */
  onSeek?: (sec: number) => void
  className?: string
}

/**
 * 진행 막대 [STEP 3-㉕]. 채움은 requestAnimationFrame으로 요소의 transform(scaleX)만 바꾸고 React 상태는 바꾸지 않는다.
 * 탭이 안 보이면 그리기를 멈춘다. 옮길 수 있는 막대는 보이는 두께는 그대로 두고 누르는 영역을 44px로 넓힌다
 */
export default function ProgressBar({ seg, cheerAt, live, running, getCurrentTime, elapsed, onSeek, className }: Props) {
  const fillRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // 끄는 중의 비율. 끄는 동안은 그리기 루프가 채움을 건드리지 않는다
  const dragRatio = useRef<number | null>(null)
  // 옮긴 직후 플레이어가 잠시 옮기기 전 위치를 돌려줘도 막대가 되돌아가지 않게, 옮긴 곳 근처 값이 올 때까지 기다린다
  const seekingTo = useRef<{ t: number; until: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const start = seg?.start ?? 0
  const end = seg?.end ?? 0

  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return
    const range = { start, end }
    if (!live || end <= start) {
      fill.style.transform = 'scaleX(0)'
      return
    }
    let raf = 0
    let shown: number | null = null
    let sample: PositionSample | null = null
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (dragRatio.current !== null) return
      const t = getCurrentTime()
      const pending = seekingTo.current
      if (pending) {
        if (t !== null && Math.abs(t - pending.t) <= SEEK_SETTLE_SEC) seekingTo.current = null
        else if (now < pending.until) return
        else seekingTo.current = null
        shown = null
      }
      // 불러오기·옮기기 직후 이전 위치가 잠깐 오는 것은 버린다
      if (t !== null && t >= range.start - 1 && t <= range.end + 1 && (sample === null || t !== sample.t)) {
        sample = { t, at: now }
      }
      if (!sample) return
      shown = nextShownTime(shown, sample, now, running)
      fill.style.transform = `scaleX(${ratioOf(shown, range)})`
    }
    const startLoop = () => {
      cancelAnimationFrame(raf)
      if (document.visibilityState === 'visible') raf = requestAnimationFrame(frame)
    }
    startLoop()
    document.addEventListener('visibilitychange', startLoop)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', startLoop)
    }
  }, [live, running, start, end, getCurrentTime])

  const cheer = seg && cheerAt !== null && cheerAt > start && cheerAt < end ? ratioOf(cheerAt, seg) : null
  const duration = Math.max(0, end - start)
  const seekable = onSeek !== undefined && seg !== null && live

  function show(ratio: number) {
    dragRatio.current = ratio
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${ratio})`
    const label = labelRef.current
    if (label && seg) {
      label.textContent = formatTime(Math.floor(seekTimeAt(ratio, seg) - seg.start))
      label.style.left = `${ratio * 100}%`
    }
  }

  function ratioFromEvent(e: PointerEvent<HTMLDivElement>): number {
    const rect = (trackRef.current ?? e.currentTarget).getBoundingClientRect()
    return pointerRatio(e.clientX, rect.left, rect.width)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!seekable || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    show(ratioFromEvent(e))
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragRatio.current === null) return
    show(ratioFromEvent(e))
  }

  function seekTo(t: number) {
    seekingTo.current = { t, until: performance.now() + SEEK_WAIT_MS }
    if (fillRef.current && seg) fillRef.current.style.transform = `scaleX(${ratioOf(t, seg)})`
    onSeek?.(t)
  }

  function finish(commit: boolean) {
    const ratio = dragRatio.current
    dragRatio.current = null
    setDragging(false)
    if (commit && ratio !== null && seg) seekTo(seekTimeAt(ratio, seg))
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!seekable || !seg) return
    // 화면 경과(초 단위, 250ms마다)는 방금 옮긴 것을 아직 모를 수 있어 플레이어의 지금 위치를 기준으로 한다
    const t = keySeekTime(e.key, seekingTo.current?.t ?? getCurrentTime() ?? start + elapsed, seg)
    if (t === null) return
    e.preventDefault()
    // 방향키가 다른 단축키로 가지 않게 한다
    e.stopPropagation()
    seekTo(t)
  }

  const bar = (
    <div className="progress" ref={trackRef}>
      <div className="progress-fill" ref={fillRef} />
      {cheer !== null && <div className="progress-cheer" style={{ left: `${cheer * 100}%` }} />}
    </div>
  )

  if (!seekable) {
    return (
      <div className={className ? `progress-hit ${className}` : 'progress-hit'} aria-hidden="true">
        {bar}
      </div>
    )
  }

  return (
    <div
      className={['progress-hit', 'is-seekable', dragging && 'is-dragging', className].filter(Boolean).join(' ')}
      role="slider"
      tabIndex={0}
      aria-label="재생 위치"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.min(duration, elapsed)}
      aria-valuetext={`${formatTime(Math.min(duration, elapsed))} / ${formatTime(duration)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finish(true)}
      onPointerCancel={() => finish(false)}
      onKeyDown={onKeyDown}
    >
      {bar}
      <span className="progress-label" ref={labelRef} aria-hidden="true" />
    </div>
  )
}
