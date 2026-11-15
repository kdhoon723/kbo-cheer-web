//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { getTeam } from '../data/teams.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { cheerHereSecond, cheerTarget, segmentElapsed } from '../lib/playback.ts'
import { formatTime } from '../lib/time.ts'
import type { NowPlaying } from '../types.ts'
import PlayerHost from './PlayerHost.tsx'
import Toast from './Toast.tsx'
import VolumeSlider from './VolumeSlider.tsx'

const TICK_MS = 250

type PlaybackStatus = ReturnType<typeof usePlayer>['status']

const STATUS_LABELS: Record<PlaybackStatus, string> = {
  idle: '대기 중',
  starting: '재생 준비 중',
  playing: '지금 재생',
  fading: '멈추는 중',
}

// 어느 재생에서 읽은 값인지 함께 둬서, 새 곡을 눌렀을 때 직전 곡의 값이 잠깐 남아 보이지 않게 한다
interface Tick {
  seg: NowPlaying | null
  elapsed: number
  canCheerHere: boolean
}

interface Props {
  situationSlotRef: (el: HTMLDivElement | null) => void
}

export default function PlayerPanel({ situationSlotRef }: Props) {
  const { nowPlaying, status, playerReady, canControlVolume, stop, skipToCheer, getCurrentTime } = usePlayer()
  const { songs, updateSong } = useSongs()
  const { settings, setVolume } = usePrefs()
  const [expanded, setExpanded] = useState(false)
  const [tick, setTick] = useState<Tick>({ seg: null, elapsed: 0, canCheerHere: false })

  const song = nowPlaying ? songs.find((s) => s.id === nowPlaying.songId) : undefined
  const current = nowPlaying !== null && tick.seg === nowPlaying ? tick : null
  const canSkip = playerReady && cheerTarget(song, nowPlaying) !== null
  const canCheerHere = current?.canCheerHere ?? false

  useEffect(() => {
    if (!nowPlaying) return
    const id = setInterval(() => {
      const t = getCurrentTime()
      const elapsed = segmentElapsed(nowPlaying, t)
      const canCheerHere = cheerHereSecond(song, t) !== null
      setTick((prev) =>
        prev.seg === nowPlaying && prev.elapsed === elapsed && prev.canCheerHere === canCheerHere
          ? prev
          : { seg: nowPlaying, elapsed, canCheerHere },
      )
    }, TICK_MS)
    return () => clearInterval(id)
  }, [nowPlaying, song, getCurrentTime])

  function onCheerHere() {
    const sec = cheerHereSecond(song, getCurrentTime())
    if (!song || sec === null) return
    updateSong({ ...song, cheerStart: sec })
  }

  const live = nowPlaying !== null && song !== undefined
  const duration = nowPlaying ? nowPlaying.end - nowPlaying.start : 0
  const elapsed = current?.elapsed ?? 0
  const cheerAt = cheerTarget(song, nowPlaying)
  const percent = (sec: number) => `${duration > 0 ? (sec / duration) * 100 : 0}%`

  const className = [
    'player-panel',
    expanded && 'is-expanded',
    live && 'is-live',
    live && status === 'playing' && 'is-playing',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className} aria-label="재생 상태">
      <PlayerHost />
      <div className="dock">
        <Toast />
        <div className="panel-controls">
          <div className="now">
            <p className="now-label">{live ? STATUS_LABELS[status] : STATUS_LABELS.idle}</p>
            <p className="now-title">
              {song ? song.title : '선택한 곡 없음'}
              {song && <span className="now-team"> · {getTeam(song.teamId).name}</span>}
            </p>
            <p className="now-time">
              {live ? `${formatTime(elapsed)} / ${formatTime(duration)}` : '--:-- / --:--'}
              {live && cheerAt !== null && nowPlaying && (
                <span className="now-cheer"> · 응원가 {formatTime(cheerAt - nowPlaying.start)}</span>
              )}
            </p>
            <div className="progress" aria-hidden="true">
              <div className="progress-fill" style={{ width: live ? percent(elapsed) : '0%' }} />
              {live && cheerAt !== null && nowPlaying && (
                <div className="progress-cheer" style={{ left: percent(cheerAt - nowPlaying.start) }} />
              )}
            </div>
          </div>
          <button
            type="button"
            className="panel-toggle"
            aria-expanded={expanded}
            aria-controls="panel-extra"
            aria-label={expanded ? '조작 줄 접기' : '조작 줄 펼치기'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▴' : '▾'}
          </button>
          <button type="button" className="skip-btn" disabled={!canSkip} onClick={skipToCheer}>
            응원가로
          </button>
          <button type="button" className="stop-btn" disabled={status === 'idle'} onClick={stop}>
            ■ 정지
          </button>
          <div className="panel-extra" id="panel-extra">
            <button type="button" disabled={!canCheerHere} onClick={onCheerHere}>
              지금 → 응원가 시작
            </button>
            <VolumeSlider value={settings.volume} onChange={setVolume} supported={canControlVolume} />
          </div>
        </div>
        <div className="dock-situations" ref={situationSlotRef} />
      </div>
    </aside>
  )
}
