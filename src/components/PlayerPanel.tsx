//20241476-김도훈-(2026-11-15)
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronsRight, EllipsisVertical, Flag, Square } from 'lucide-react'
import { useReducedMotionConfig } from 'motion/react'
import { useAnimate } from 'motion/react-mini'
import * as m from 'motion/react-m'
import { playerOf } from '../data/players.ts'
import { getTeam } from '../data/teams.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery.ts'
import { cheerHereSecond, cheerTarget, segmentElapsed } from '../lib/playback.ts'
import { formatTime } from '../lib/time.ts'
import type { NowPlaying } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import { distance, ease, quick, row, rowTextDelay, swap } from '../ui/motionTokens.ts'
import { bandStyle } from './band.ts'
import PlayerCard from './PlayerCard.tsx'
import PlayerHost from './PlayerHost.tsx'
import PlayerPortrait from './PlayerPortrait.tsx'
import Sheet from './Sheet.tsx'
import TeamLogo from './TeamLogo.tsx'
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
  const [tick, setTick] = useState<Tick>({ seg: null, elapsed: 0, canCheerHere: false })
  const [hasPlayed, setHasPlayed] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [nowOpen, setNowOpen] = useState(false)
  const narrow = useMediaQuery(NARROW_QUERY)
  // 지금 재생 시트는 휴대폰 배치에서만 쓴다. 넓어지면 닫아 두어 다시 좁힐 때 저절로 열리지 않게 한다
  if (nowOpen && !narrow) setNowOpen(false)
  const [rowRef, animate] = useAnimate<HTMLDivElement>()
  const idleHeight = useRef(0)
  // mini의 useAnimate는 MotionConfig를 읽지 않으므로 동작 줄이기는 여기서 직접 본다
  const reduceMotion = useReducedMotionConfig()

  const song = nowPlaying ? songs.find((s) => s.id === nowPlaying.songId) : undefined
  if (song && !hasPlayed) setHasPlayed(true)
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

  // 곡을 틀기 전 높이를 늘 알고 있어야 첫 곡에 자라는 시작점을 잡을 수 있다. 화면 폭이 바뀌면 높이도 바뀐다
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el || hasPlayed) return
    const observer = new ResizeObserver(() => {
      idleHeight.current = el.offsetHeight
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasPlayed, rowRef])

  // 재생 줄이 처음 곡에 한 번 자란다. 앱에서 높이를 움직이는 곳은 여기 하나다
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el || !hasPlayed) return
    const to = el.offsetHeight
    if (to === idleHeight.current || reduceMotion) return
    // 자라는 동안 안의 버튼이 아래 상황 칸 위로 삐져나오지 않게 한다
    el.style.overflow = 'clip'
    const growth = animate(el, { height: [`${idleHeight.current}px`, `${to}px`] }, row)
    const settle = () => {
      el.style.height = ''
      el.style.overflow = ''
    }
    void growth.then(settle)
    return () => {
      growth.stop()
      settle()
    }
  }, [hasPlayed, rowRef, animate, reduceMotion])

  function onCheerHere() {
    const sec = cheerHereSecond(song, getCurrentTime())
    if (!song || sec === null) return
    updateSong({ ...song, cheerStart: sec })
  }

  const live = nowPlaying !== null && song !== undefined
  const duration = nowPlaying ? nowPlaying.end - nowPlaying.start : 0
  const elapsed = current?.elapsed ?? 0
  const cheerAt = cheerTarget(song, nowPlaying)
  const ratio = (sec: number) => (duration > 0 ? sec / duration : 0)
  const panelClass = ['player-panel', live && 'is-live', hasPlayed && 'has-played'].filter(Boolean).join(' ')

  // 노트북은 오른쪽 열에 늘 두고, 휴대폰은 경기 중에 쓰지 않으니 더보기 시트로 옮긴다
  const tools = (
    <>
      <TapButton type="button" className="cheer-here-btn" disabled={!canCheerHere} onClick={onCheerHere}>
        <Flag size={18} strokeWidth={1.75} aria-hidden="true" />
        지금을 응원가 시작으로
      </TapButton>
      <VolumeSlider value={settings.volume} onChange={setVolume} supported={canControlVolume} />
    </>
  )

  const cheerOffset = live && cheerAt !== null && nowPlaying ? cheerAt - nowPlaying.start : null
  const timeText = live ? `${formatTime(elapsed)} / ${formatTime(duration)}` : '--:-- / --:--'
  const progress = (
    <div className="progress" aria-hidden="true">
      <div className="progress-fill" style={{ transform: `scaleX(${live ? ratio(elapsed) : 0})` }} />
      {cheerOffset !== null && <div className="progress-cheer" style={{ left: `${ratio(cheerOffset) * 100}%` }} />}
    </div>
  )

  const nowFace = (
    <>
      {song &&
        (song.kind === 'player' ? (
          <PlayerPortrait teamId={song.teamId} player={playerOf(song)} size="dock" />
        ) : (
          <TeamLogo teamId={song.teamId} size={36} />
        ))}
      <NowText
        key={hasPlayed ? 'live' : 'idle'}
        rise={hasPlayed}
        label={live ? STATUS_LABELS[status] : STATUS_LABELS.idle}
        titleKey={song?.id ?? null}
        title={song ? song.title : '선택한 곡 없음'}
      >
        {song && (
          <>
            <span className="now-team">{getTeam(song.teamId).name}</span>
            <span className="now-sep"> · </span>
          </>
        )}
        <span className="now-time">{timeText}</span>
        {cheerOffset !== null && <span className="now-cheer"> · 응원가 {formatTime(cheerOffset)}</span>}
      </NowText>
    </>
  )

  return (
    <aside className={panelClass} style={song ? bandStyle(song.teamId) : undefined} aria-label="재생 상태">
      <div className="player-stage">
        <PlayerHost />
      </div>
      <div className="player-card-area">
        <PlayerCard song={song ?? null} />
      </div>
      <div className="player-tools">{tools}</div>
      <div className="dock">
        <Toast />
        {progress}
        <div className="play-row" ref={rowRef}>
          {/* 곡이 없을 때도 같은 버튼으로 두어야 곡을 멈추고 틀 때마다 글자가 다시 만들어지지 않는다 */}
          {narrow ? (
            <button
              type="button"
              className="now-open"
              aria-label={song ? `지금 재생 크게 보기: ${song.title}` : '지금 재생 크게 보기'}
              aria-haspopup="dialog"
              aria-expanded={nowOpen}
              disabled={!song}
              onClick={() => setNowOpen(true)}
            >
              {nowFace}
            </button>
          ) : (
            nowFace
          )}
          <div className="play-actions">
            <TapButton type="button" className="skip-btn" disabled={!canSkip} onClick={skipToCheer}>
              <ChevronsRight className="wide-only" size={18} strokeWidth={1.75} aria-hidden="true" />
              응원가로
            </TapButton>
            <TapButton
              type="button"
              className="stop-btn"
              aria-label="정지"
              disabled={status === 'idle'}
              onClick={stop}
            >
              <Square size={16} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
              <span className="wide-only">정지</span>
            </TapButton>
            <TapButton
              type="button"
              className="more-btn narrow-only"
              aria-label="더보기"
              aria-haspopup="dialog"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen(true)}
            >
              <EllipsisVertical size={20} strokeWidth={1.75} aria-hidden="true" />
            </TapButton>
          </div>
        </div>
        <div className="dock-situations" ref={situationSlotRef} />
      </div>
      <Sheet
        open={nowOpen}
        title="지금 재생"
        titleId="now-sheet-title"
        className="now-sheet"
        onClose={() => setNowOpen(false)}
      >
        <PlayerCard song={song ?? null} />
        <div className="now-sheet-progress">{progress}</div>
        <p className="now-sheet-time">
          <span>{timeText}</span>
          {cheerOffset !== null && <span className="now-sheet-cheer">응원가 {formatTime(cheerOffset)}</span>}
        </p>
      </Sheet>
      <Sheet open={toolsOpen} title="재생 도구" titleId="tools-sheet-title" onClose={() => setToolsOpen(false)}>
        <div className="sheet-tools">{tools}</div>
      </Sheet>
    </aside>
  )
}

interface NowTextProps {
  rise: boolean
  label: string
  titleKey: string | null
  title: string
  children: ReactNode
}

function NowText({ rise, label, titleKey, title, children }: NowTextProps) {
  // 처음 곡이 올라오는 순간에는 줄 전체만 움직이고 제목은 따로 바뀌지 않는다
  const [firstTitleKey] = useState(titleKey)
  return (
    <m.div
      className="now"
      initial={rise ? { opacity: 0, y: distance.row } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...swap, delay: rowTextDelay }}
    >
      <p className="now-label">{label}</p>
      <m.p
        key={titleKey ?? 'none'}
        className="now-title"
        initial={titleKey === firstTitleKey ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...quick, ease: ease.out }}
      >
        {title}
      </m.p>
      <p className="now-meta">{children}</p>
    </m.div>
  )
}
