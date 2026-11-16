//20241476-김도훈-(2026-11-16)
import { useEffect, useRef } from 'react'
import { segmentRatio } from '../lib/songEdit.ts'
import { formatTime } from '../lib/time.ts'

interface Props {
  start: number
  end: number
  cheerStart: number | null
  /** 이 곡을 미리 듣는 중이면 재생 위치를 읽는 함수 */
  position: (() => number | null) | null
}

const TICK_MS = 250

/**
 * 곡 구간 막대: 시작–끝, 응원가 시작 눈금, 미리 듣는 중이면 재생 위치 선.
 * 재생 위치는 React 상태를 바꾸지 않고 요소의 transform만 고친다
 */
export default function SegmentBar({ start, end, cheerStart, position }: Props) {
  const headRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const head = headRef.current
    if (!head || !position) return
    const draw = () => {
      const t = position()
      const visible = t !== null && t >= start - 1 && t <= end + 1
      head.style.opacity = visible ? '1' : '0'
      if (visible) head.style.transform = `translateX(${segmentRatio(t, start, end) * 100}%)`
    }
    draw()
    const id = window.setInterval(draw, TICK_MS)
    return () => window.clearInterval(id)
  }, [position, start, end])

  const cheer = cheerStart !== null && cheerStart > start && cheerStart < end ? segmentRatio(cheerStart, start, end) : null
  return (
    <div className="segment">
      <div className="segment-track" aria-hidden="true">
        {cheer !== null && <div className="segment-cheer" style={{ left: `${cheer * 100}%` }} />}
        {position && (
          <div className="segment-head" ref={headRef}>
            <span />
          </div>
        )}
      </div>
      <p className="segment-times">
        <span>{formatTime(start)}</span>
        {cheerStart !== null && cheer !== null && <span className="segment-cheer-label">응원가 {formatTime(cheerStart)}</span>}
        <span>{formatTime(end)}</span>
      </p>
    </div>
  )
}
