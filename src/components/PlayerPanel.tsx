//20241476-김도훈-(2026-11-15)
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronsRight, EllipsisVertical, Flag, Play, Square } from 'lucide-react'
import { useReducedMotionConfig } from 'motion/react'
import { useAnimate } from 'motion/react-mini'
import * as m from 'motion/react-m'
import { playerOf } from '../data/players.ts'
import { getTeam } from '../data/teams.ts'
import { useHistory } from '../context/historyState.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery.ts'
import { useSongLyrics } from '../hooks/useSongLyrics.ts'
import { cheerHereSecond, cheerTarget, segmentElapsed } from '../lib/playback.ts'
import { formatTime } from '../lib/time.ts'
import type { NowPlaying } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import { distance, ease, quick, row, rowTextDelay, swap } from '../ui/motionTokens.ts'
import { bandStyle } from './band.ts'
import LyricsBlock from './LyricsBlock.tsx'
import PlayerCard from './PlayerCard.tsx'
import PlayerHost from './PlayerHost.tsx'
import PlayerPortrait from './PlayerPortrait.tsx'
import Sheet from './Sheet.tsx'
import TeamLogo from './TeamLogo.tsx'
import Toast from './Toast.tsx'
import VolumeSlider from './VolumeSlider.tsx'

const TICK_MS = 250

type PlaybackStatus = ReturnType<typeof usePlayer>['status']

const STOPPED_LABEL = '멈춤'

const STATUS_LABELS: Record<PlaybackStatus, string> = {
  idle: '대기 중',
  starting: '재생 준비 중',
  playing: '지금 재생',
  fading: '멈추는 중',
  paused: '일시정지',
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
  const { nowPlaying, status, playerReady, canControlVolume, play, stop, resume, skipToCheer, getCurrentTime } =
    usePlayer()
  const { songs, updateSong } = useSongs()
  const { settings, setVolume } = usePrefs()
  const { history } = useHistory()
  const [tick, setTick] = useState<Tick>({ seg: null, elapsed: 0, canCheerHere: false })
  // 이번에 연 뒤 실제로 튼 적이 있는가. 휴대폰은 그때까지 플레이어 자리를 접어 둔다
  const [hasPlayed, setHasPlayed] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [nowOpen, setNowOpen] = useState(false)
  const narrow = useMediaQuery(NARROW_QUERY)
  // 지금 재생 시트는 휴대폰 배치에서만 쓴다. 넓어지면 닫아 두어 다시 좁힐 때 저절로 열리지 않게 한다
  if (nowOpen && !narrow) setNowOpen(false)
  const [rowRef, animate] = useAnimate<HTMLDivElement>()
  const dockRef = useRef<HTMLDivElement>(null)
  const idleHeight = useRef(0)
  // mini의 useAnimate는 MotionConfig를 읽지 않으므로 동작 줄이기는 여기서 직접 본다
  const reduceMotion = useReducedMotionConfig()

  const playing = nowPlaying ? songs.find((s) => s.id === nowPlaying.songId) : undefined
  // 멈춘 뒤와 새로고침 뒤에도 마지막으로 누른 곡(최근 곡 맨 앞)을 남긴다. 그 곡을 지우면 남기지 않는다
  const last = nowPlaying ? undefined : songs.find((s) => s.id === history.recent[0])
  const song = playing ?? last
  if (playing && !hasPlayed) setHasPlayed(true)
  // 재생 줄은 곡이 처음 올라올 때 한 번 자란다. 열 때부터 마지막 곡이 있으면 자랄 일이 없다
  const [filledAtStart] = useState(song !== undefined)
  const [rowFilled, setRowFilled] = useState(filledAtStart)
  if (song && !rowFilled) setRowFilled(true)
  const current = nowPlaying !== null && tick.seg === nowPlaying ? tick : null
  const canSkip = playerReady && cheerTarget(playing, nowPlaying) !== null
  const canCheerHere = current?.canCheerHere ?? false
  const live = nowPlaying !== null && playing !== undefined
  const lyric = useSongLyrics(song, live)

  useEffect(() => {
    if (!nowPlaying) return
    const id = setInterval(() => {
      const t = getCurrentTime()
      const elapsed = segmentElapsed(nowPlaying, t)
      const canCheerHere = cheerHereSecond(playing, t) !== null
      setTick((prev) =>
        prev.seg === nowPlaying && prev.elapsed === elapsed && prev.canCheerHere === canCheerHere
          ? prev
          : { seg: nowPlaying, elapsed, canCheerHere },
      )
    }, TICK_MS)
    return () => clearInterval(id)
  }, [nowPlaying, playing, getCurrentTime])

  // 곡을 틀기 전 높이를 늘 알고 있어야 첫 곡에 자라는 시작점을 잡을 수 있다. 화면 폭이 바뀌면 높이도 바뀐다
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el || rowFilled) return
    const observer = new ResizeObserver(() => {
      idleHeight.current = el.offsetHeight
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [rowFilled, rowRef])

  // 휴대폰은 독이 화면 아래에 붙어 있어, 곡 수정의 고정 저장 줄이 독 위에 놓이게 독 높이를 CSS 변수로 알린다 [STEP 3-㉓]
  useLayoutEffect(() => {
    const el = dockRef.current
    if (!el) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty('--dock-h', `${el.offsetHeight}px`))
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--dock-h')
    }
  }, [])

  // 재생 줄이 처음 곡에 한 번 자란다. 앱에서 높이를 움직이는 곳은 여기 하나다
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el || !rowFilled || filledAtStart) return
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
  }, [rowFilled, filledAtStart, rowRef, animate, reduceMotion])

  function onCheerHere() {
    const sec = cheerHereSecond(playing, getCurrentTime())
    if (!playing || sec === null) return
    updateSong({ ...playing, cheerStart: sec })
  }

  // 멈춘 마지막 곡도 같은 막대·시간·눈금을 쓰게 그 곡의 구간을 재생 구간처럼 다룬다
  const seg = nowPlaying ?? (song ? { songId: song.id, videoId: song.videoId, start: song.start, end: song.end } : null)
  const duration = seg ? seg.end - seg.start : 0
  const elapsed = current?.elapsed ?? 0
  const cheerAt = cheerTarget(song, seg)
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

  const cheerOffset = cheerAt !== null && seg ? cheerAt - seg.start : null
  const timeText = song ? `${formatTime(live ? elapsed : 0)} / ${formatTime(duration)}` : '--:-- / --:--'
  const label = live ? STATUS_LABELS[status] : song ? STOPPED_LABEL : STATUS_LABELS.idle
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
        key={rowFilled ? 'song' : 'idle'}
        rise={rowFilled && !filledAtStart}
        label={label}
        titleKey={song?.id ?? null}
        title={song ? song.title : '선택한 곡 없음'}
      >
        {song && (
          <>
            <span className="now-team">{getTeam(song.teamId).name}</span>
            <span className="now-sep"> · </span>
          </>
        )}
        {/* 휴대폰은 상태 글자 줄이 없어, 일시정지만 시간 앞에 쓴다. 정지 뒤(00:00)와 구별해야 이어서 틀 수 있음을 안다 */}
        {status === 'paused' && <span className="now-state">{STATUS_LABELS.paused} · </span>}
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
      <div className="dock" ref={dockRef}>
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
            {status === 'paused' ? (
              // 플레이어를 직접 눌러 멈춘 곡은 멈춘 자리부터 이어 튼다
              <TapButton type="button" className="stop-btn" aria-label="이어서" onClick={resume}>
                <Play size={16} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
                <span className="wide-only">이어서</span>
              </TapButton>
            ) : status === 'idle' && song ? (
              <TapButton type="button" className="stop-btn" aria-label="다시 재생" onClick={() => play(song)}>
                <Play size={16} strokeWidth={1.75} fill="currentColor" aria-hidden="true" />
                <span className="wide-only">다시 재생</span>
              </TapButton>
            ) : (
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
            )}
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
      {lyric && (
        <div className="player-lyrics">
          <LyricsBlock lyric={lyric} open={lyricsOpen} onToggle={() => setLyricsOpen((o) => !o)} />
        </div>
      )}
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
          <span>{status === 'paused' ? `${STATUS_LABELS.paused} · ${timeText}` : timeText}</span>
          {cheerOffset !== null && <span className="now-sheet-cheer">응원가 {formatTime(cheerOffset)}</span>}
        </p>
        {lyric && <LyricsBlock lyric={lyric} open={lyricsOpen} onToggle={() => setLyricsOpen((o) => !o)} />}
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
