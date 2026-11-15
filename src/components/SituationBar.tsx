//20241476-김도훈-(2026-11-15)
import { useEffect, useRef, useState } from 'react'
import type { Song } from '../types.ts'

interface Props {
  songs: Song[]
  nowPlayingId: string | null
  onPlay: (song: Song) => void
}

export default function SituationBar({ songs, nowPlayingId, onPlay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })
  const hasSongs = songs.length > 0

  // 휴대폰에서 한 줄 안에서만 넘기는 줄이라, 가려진 버튼이 있는 쪽을 표시한다
  useEffect(() => {
    const scroller = scrollRef.current
    const track = trackRef.current
    if (!scroller || !track || typeof ResizeObserver === 'undefined') return
    function measure() {
      if (!scroller) return
      const max = scroller.scrollWidth - scroller.clientWidth
      const left = scroller.scrollLeft > 1
      const right = scroller.scrollLeft < max - 1
      setMore((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    observer.observe(track)
    scroller.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', measure)
    }
  }, [hasSongs])

  if (!hasSongs) return null
  const className = ['situation-bar', more.left && 'more-left', more.right && 'more-right'].filter(Boolean).join(' ')
  return (
    <div className={className} role="group" aria-labelledby="situation-title">
      <h2 id="situation-title" className="situation-title">
        상황
      </h2>
      <div className="situation-scroll" ref={scrollRef}>
        <div className="situation-track" ref={trackRef}>
          {songs.map((song, i) => {
            const playing = song.id === nowPlayingId
            return (
              <button
                key={song.id}
                type="button"
                className={playing ? 'play-btn situation-btn is-playing' : 'play-btn situation-btn'}
                aria-pressed={playing}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPlay(song)}
              >
                {i < 9 && <kbd className="situation-index">{i + 1}</kbd>}
                <span className="situation-label">{song.title}</span>
              </button>
            )
          })}
        </div>
      </div>
      <span className="situation-more is-left" aria-hidden="true">
        ‹
      </span>
      <span className="situation-more is-right" aria-hidden="true">
        ›
      </span>
    </div>
  )
}
