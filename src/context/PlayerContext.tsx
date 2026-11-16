//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isIOS } from '../lib/env.ts'
import { cheerTarget, isLeftoverStop, isStalePosition, pauseCause, playerErrorMessage } from '../lib/playback.ts'
import { loadYouTubeIframeApi } from '../player/youtubeIframe.ts'
import type { NowPlaying, Song } from '../types.ts'
import { useHistory } from './historyState.ts'
import { useNotice } from './NoticeContext.tsx'
import { usePrefs } from './PrefsContext.tsx'
import { useSongs } from './SongsContext.tsx'

type PlayerApiState = 'loading' | 'loaded' | 'failed'
// paused: 플레이어를 직접 눌렀거나 전화 등으로 멈춘 상태. 곡 구간을 그대로 두고 「이어서」로 멈춘 자리부터 튼다
type PlaybackStatus = 'idle' | 'starting' | 'playing' | 'fading' | 'paused'

interface PlayerContextValue {
  apiState: PlayerApiState
  playerReady: boolean
  status: PlaybackStatus
  nowPlaying: NowPlaying | null
  canControlVolume: boolean
  play: (song: Song) => void
  stop: () => void
  /** 일시정지한 곡을 멈춘 자리부터 다시 튼다 */
  resume: () => void
  skipToCheer: () => void
  getCurrentTime: () => number | null
  attachHost: (el: HTMLDivElement | null) => void
}

const WATCH_MS = 200
const AUTOPLAY_CHECK_MS = 3000
// IFrame API 스크립트를 받은 뒤 플레이어 iframe이 준비(onReady)될 때까지 기다리는 한도
const READY_TIMEOUT_MS = 10000
const BUFFERING_NOTICE_MS = 8000
const FADE_STEPS = 10
const STOP_FADE_SEC = 1

const LOAD_FAILED = '플레이어를 불러오지 못했습니다'
const AUTOPLAY_BLOCKED = '영상을 한 번 직접 눌러 재생을 허용해 주세요'
const SLOW_NETWORK = '네트워크가 느려 재생이 늦어지고 있습니다'

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { songs } = useSongs()
  const { settings } = usePrefs()
  const { notify } = useNotice()
  const { recordPlay } = useHistory()

  const [apiAttempt, setApiAttempt] = useState(0)
  const [apiState, setApiState] = useState<PlayerApiState>('loading')
  const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [canControlVolume] = useState(() => !isIOS())

  const playerRef = useRef<YT.Player | null>(null)
  const readyRef = useRef(false)
  const statusRef = useRef<PlaybackStatus>('idle')
  const segRef = useRef<NowPlaying | null>(null)
  const pendingRef = useRef<NowPlaying | null>(null)
  const volumeRef = useRef(settings.volume)
  const songsRef = useRef(songs)
  const fadingRef = useRef(false)
  const seekAtRef = useRef(0)
  const loadedAtRef = useRef(0)
  const playedSinceLoadRef = useRef(false)
  const pausingByAppRef = useRef(false)
  const bufferingSinceRef = useRef<number | null>(null)
  const bufferingNoticedRef = useRef(false)
  const fadeTimerRef = useRef<number | null>(null)
  const autoplayTimerRef = useRef<number | null>(null)

  // 재생 중인 곡이 곡 목록에서 사라지면(BR-24, BR-40) 화면 상태는 이 렌더링에서 바로 정지로 맞춘다.
  // 플레이어와 ref 정리는 아래 [songs] effect가 맡는다
  if (nowPlaying && !songs.some((s) => s.id === nowPlaying.songId)) {
    setNowPlaying(null)
    setStatus('idle')
  }

  const setStatusBoth = useCallback((s: PlaybackStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const clearAutoplayCheck = useCallback(() => {
    if (autoplayTimerRef.current !== null) clearTimeout(autoplayTimerRef.current)
    autoplayTimerRef.current = null
  }, [])

  const cancelFade = useCallback(() => {
    if (fadeTimerRef.current !== null) clearInterval(fadeTimerRef.current)
    fadeTimerRef.current = null
    fadingRef.current = false
  }, [])

  const halt = useCallback(() => {
    cancelFade()
    clearAutoplayCheck()
    pendingRef.current = null
    bufferingSinceRef.current = null
    const p = playerRef.current
    if (readyRef.current && p) {
      const state = p.getPlayerState()
      // 이미 멈춘(끝난) 플레이어는 PAUSED를 보내지 않으므로, 표시를 남기면 다음 외부 정지를 놓친다
      if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) pausingByAppRef.current = true
      p.pauseVideo()
      p.setVolume(volumeRef.current)
    }
    segRef.current = null
    statusRef.current = 'idle'
  }, [cancelFade, clearAutoplayCheck])

  const finish = useCallback(() => {
    halt()
    setNowPlaying(null)
    setStatus('idle')
  }, [halt])

  const startFade = useCallback(
    (durationSec: number) => {
      if (fadingRef.current) return
      cancelFade()
      fadingRef.current = true
      setStatusBoth('fading')
      const from = volumeRef.current
      let step = 0
      fadeTimerRef.current = window.setInterval(
        () => {
          step++
          if (readyRef.current) playerRef.current?.setVolume(Math.round(from * (1 - step / FADE_STEPS)))
          if (step >= FADE_STEPS) finish()
        },
        (durationSec * 1000) / FADE_STEPS,
      )
    },
    [cancelFade, finish, setStatusBoth],
  )

  const startAutoplayCheck = useCallback(
    (seg: NowPlaying) => {
      clearAutoplayCheck()
      autoplayTimerRef.current = window.setTimeout(() => {
        autoplayTimerRef.current = null
        const p = playerRef.current
        if (segRef.current !== seg || !readyRef.current || !p) return
        const state = p.getPlayerState()
        if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) notify(AUTOPLAY_BLOCKED)
      }, AUTOPLAY_CHECK_MS)
    },
    [clearAutoplayCheck, notify],
  )

  const loadSegment = useCallback(
    (seg: NowPlaying) => {
      const p = playerRef.current
      if (!p) return
      seekAtRef.current = performance.now()
      loadedAtRef.current = seekAtRef.current
      playedSinceLoadRef.current = false
      p.setVolume(volumeRef.current)
      p.loadVideoById({ videoId: seg.videoId, startSeconds: seg.start, endSeconds: seg.end })
      startAutoplayCheck(seg)
    },
    [startAutoplayCheck],
  )

  const runPending = useCallback(() => {
    const seg = pendingRef.current
    pendingRef.current = null
    if (seg && segRef.current === seg) loadSegment(seg)
  }, [loadSegment])

  const play = useCallback(
    (song: Song) => {
      cancelFade()
      clearAutoplayCheck()
      pendingRef.current = null
      bufferingSinceRef.current = null
      bufferingNoticedRef.current = false
      recordPlay(song.id)
      const seg: NowPlaying = { songId: song.id, videoId: song.videoId, start: song.start, end: song.end }
      segRef.current = seg
      setNowPlaying(seg)
      setStatusBoth('starting')
      seekAtRef.current = performance.now()
      if (apiState === 'failed') {
        notify(LOAD_FAILED, 'error')
        setApiState('loading')
        setApiAttempt((n) => n + 1)
      }
      if (!readyRef.current) {
        pendingRef.current = seg
        return
      }
      loadSegment(seg)
    },
    [apiState, cancelFade, clearAutoplayCheck, loadSegment, notify, recordPlay, setStatusBoth],
  )

  const stop = useCallback(() => {
    pendingRef.current = null
    if (!segRef.current) return
    // 일시정지 중에는 소리가 없어 줄일 것이 없다. 바로 끝낸다
    if (fadingRef.current || !canControlVolume || !readyRef.current || statusRef.current === 'paused') {
      finish()
      return
    }
    startFade(STOP_FADE_SEC)
  }, [canControlVolume, finish, startFade])

  const resume = useCallback(() => {
    const seg = segRef.current
    const p = playerRef.current
    if (!seg || statusRef.current !== 'paused' || !readyRef.current || !p) return
    setStatusBoth('starting')
    p.playVideo()
    startAutoplayCheck(seg)
  }, [setStatusBoth, startAutoplayCheck])

  const skipToCheer = useCallback(() => {
    const seg = segRef.current
    const p = playerRef.current
    if (!seg || !readyRef.current || !p) return
    const target = cheerTarget(songsRef.current.find((s) => s.id === seg.songId), seg)
    if (target === null) return
    seekAtRef.current = performance.now()
    p.seekTo(target, true)
    // 일시정지 중에 누르면 응원가를 듣겠다는 뜻이라 그 자리에서 이어 튼다
    if (statusRef.current === 'paused') resume()
  }, [resume])

  const getCurrentTime = useCallback(
    () => (readyRef.current && playerRef.current ? playerRef.current.getCurrentTime() : null),
    [],
  )

  const handleStateChange = useCallback(
    (state: YT.PlayerState) => {
      const seg = segRef.current
      const t = playerRef.current?.getCurrentTime() ?? 0
      // 앞 곡이 끝난 상태에서 loadVideoById를 부르면 새 곡을 불러온 직후 ENDED가 한 번 더 온다(브라우저에서 확인)
      const leftover =
        seg !== null && isLeftoverStop(t, seg, performance.now() - loadedAtRef.current, playedSinceLoadRef.current)
      switch (state) {
        case YT.PlayerState.PLAYING:
          playedSinceLoadRef.current = true
          clearAutoplayCheck()
          if (seg && !fadingRef.current) setStatusBoth('playing')
          break
        case YT.PlayerState.ENDED:
          if (seg && !leftover) finish()
          break
        case YT.PlayerState.PAUSED: {
          const byApp = pausingByAppRef.current
          pausingByAppRef.current = false
          if (!seg) break
          const cause = pauseCause(byApp, t, seg, performance.now() - loadedAtRef.current, playedSinceLoadRef.current)
          // 끝 시각에 닿은 것과 끝으로 줄이던 중에 멈춘 것은 곡이 끝난 것이다
          if (cause === 'end' || (cause === 'outside' && fadingRef.current)) {
            finish()
          } else if (cause === 'outside') {
            clearAutoplayCheck()
            setStatusBoth('paused')
          }
          break
        }
        case YT.PlayerState.BUFFERING:
          bufferingSinceRef.current ??= performance.now()
          break
      }
    },
    [clearAutoplayCheck, finish, setStatusBoth],
  )

  const handleError = useCallback(
    (code: number) => {
      finish()
      notify(playerErrorMessage(code), 'error')
    },
    [finish, notify],
  )

  const handleAutoplayBlocked = useCallback(() => {
    clearAutoplayCheck()
    if (segRef.current) notify(AUTOPLAY_BLOCKED)
  }, [clearAutoplayCheck, notify])

  useEffect(() => {
    let cancelled = false
    loadYouTubeIframeApi()
      .then(() => {
        if (!cancelled) setApiState('loaded')
      })
      .catch(() => {
        if (cancelled) return
        setApiState('failed')
        if (segRef.current) {
          finish()
          notify(LOAD_FAILED, 'error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [apiAttempt, finish, notify])

  useEffect(() => {
    if (apiState !== 'loaded' || !hostEl) return
    // IFrame API가 넘긴 div를 iframe으로 바꿔 끼우므로, React가 그리는 div가 아니라 직접 만든 div를 넘긴다
    const inner = document.createElement('div')
    inner.id = 'yt-player'
    hostEl.appendChild(inner)
    let alive = true
    // 스크립트는 받았는데 iframe이 준비되지 않으면 실패로 보고 플레이어를 치운다. 다음에 곡을 누르면 새로 만든다(EX-10)
    const readyTimer = window.setTimeout(() => {
      if (!alive || readyRef.current) return
      setApiState('failed')
      if (segRef.current) {
        finish()
        notify(LOAD_FAILED, 'error')
      }
    }, READY_TIMEOUT_MS)
    const p = new YT.Player(inner, {
      width: '100%',
      height: '100%',
      // 공식 플레이어 매개변수 중 화면 요소를 줄이는 값만 쓴다. fs: 전체 화면 버튼, iv_load_policy 3: 주석 숨김.
      // 제목·채널·YouTube 로고는 매개변수로 끌 수 없다(modestbranding·showinfo는 효과 없음)
      playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, fs: 0, iv_load_policy: 3, origin: location.origin },
      events: {
        onReady: () => {
          if (!alive) return
          clearTimeout(readyTimer)
          readyRef.current = true
          setPlayerReady(true)
          runPending()
        },
        onStateChange: (e) => {
          if (alive) handleStateChange(e.data)
        },
        onError: (e) => {
          const code: number = e.data
          if (alive) handleError(code)
        },
        onAutoplayBlocked: () => {
          if (alive) handleAutoplayBlocked()
        },
      },
    })
    playerRef.current = p
    return () => {
      alive = false
      clearTimeout(readyTimer)
      cancelFade()
      clearAutoplayCheck()
      pendingRef.current = null
      readyRef.current = false
      setPlayerReady(false)
      p.destroy()
      playerRef.current = null
      inner.remove()
    }
  }, [
    apiState,
    hostEl,
    runPending,
    handleStateChange,
    handleError,
    handleAutoplayBlocked,
    cancelFade,
    clearAutoplayCheck,
    finish,
    notify,
  ])

  useEffect(() => {
    if (!nowPlaying) return
    const id = window.setInterval(() => {
      const seg = segRef.current
      const p = playerRef.current
      if (!seg || !readyRef.current || !p) return
      const state = p.getPlayerState()
      const t = p.getCurrentTime()
      if (state === YT.PlayerState.PLAYING && statusRef.current === 'starting') setStatusBoth('playing')
      if (isStalePosition(t, seg, performance.now() - seekAtRef.current)) return
      if (state !== YT.PlayerState.BUFFERING) {
        bufferingSinceRef.current = null
      } else {
        const now = performance.now()
        bufferingSinceRef.current ??= now
        if (!bufferingNoticedRef.current && now - bufferingSinceRef.current > BUFFERING_NOTICE_MS) {
          bufferingNoticedRef.current = true
          notify(SLOW_NETWORK)
        }
      }
      if (canControlVolume && statusRef.current === 'playing' && state === YT.PlayerState.PLAYING && t >= seg.end - 1) {
        startFade(seg.end - t)
      }
      if (t >= seg.end) finish()
    }, WATCH_MS)
    return () => clearInterval(id)
  }, [nowPlaying, canControlVolume, finish, notify, setStatusBoth, startFade])

  useEffect(() => {
    volumeRef.current = settings.volume
    if (readyRef.current && !fadingRef.current) playerRef.current?.setVolume(settings.volume)
  }, [settings.volume])

  useEffect(() => {
    songsRef.current = songs
    const seg = segRef.current
    if (seg && !songs.some((s) => s.id === seg.songId)) halt()
  }, [songs, halt])

  const value = useMemo(
    () => ({
      apiState,
      playerReady,
      status,
      nowPlaying,
      canControlVolume,
      play,
      stop,
      resume,
      skipToCheer,
      getCurrentTime,
      attachHost: setHostEl,
    }),
    [apiState, playerReady, status, nowPlaying, canControlVolume, play, stop, resume, skipToCheer, getCurrentTime],
  )
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer는 PlayerProvider 안에서만 쓸 수 있습니다')
  return ctx
}
