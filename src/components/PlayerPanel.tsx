//20241476-김도훈-(2026-11-15)
import { useEffect, useState } from 'react'
import { getTeam } from '../data/teams.ts'
import { usePlayer } from '../context/PlayerContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { cheerHereSecond, cheerTarget } from '../lib/playback.ts'
import type { NowPlaying } from '../types.ts'
import PlayerHost from './PlayerHost.tsx'
import VolumeSlider from './VolumeSlider.tsx'

const CHEER_HERE_CHECK_MS = 250

export default function PlayerPanel() {
  const { nowPlaying, status, playerReady, canControlVolume, stop, skipToCheer, getCurrentTime } = usePlayer()
  const { songs, updateSong } = useSongs()
  const { settings, setVolume } = usePrefs()
  const [expanded, setExpanded] = useState(false)
  // 어느 재생에서 계산한 값인지 함께 둬서, 새 곡을 눌렀을 때 직전 곡의 결과가 잠깐 남아 보이지 않게 한다
  const [cheerHere, setCheerHere] = useState<{ seg: NowPlaying | null; ok: boolean }>({ seg: null, ok: false })

  const song = nowPlaying ? songs.find((s) => s.id === nowPlaying.songId) : undefined
  const canSkip = playerReady && cheerTarget(song, nowPlaying) !== null
  const canCheerHere = nowPlaying !== null && cheerHere.seg === nowPlaying && cheerHere.ok

  useEffect(() => {
    if (!nowPlaying) return
    const id = setInterval(() => {
      const ok = cheerHereSecond(song, getCurrentTime()) !== null
      setCheerHere((prev) => (prev.seg === nowPlaying && prev.ok === ok ? prev : { seg: nowPlaying, ok }))
    }, CHEER_HERE_CHECK_MS)
    return () => clearInterval(id)
  }, [nowPlaying, song, getCurrentTime])

  function onCheerHere() {
    const sec = cheerHereSecond(song, getCurrentTime())
    if (!song || sec === null) return
    updateSong({ ...song, cheerStart: sec })
  }

  return (
    <aside className={expanded ? 'player-panel is-expanded' : 'player-panel'} aria-label="재생 상태">
      <PlayerHost />
      <div className="panel-controls">
        <div className="panel-extra" id="panel-extra">
          <button type="button" disabled={!canCheerHere} onClick={onCheerHere}>
            지금 → 응원가 시작
          </button>
          <VolumeSlider value={settings.volume} onChange={setVolume} supported={canControlVolume} />
        </div>
        <div className="panel-main">
          <div className="panel-title">
            <p className="now-playing">{song ? `▶ ${song.title} [${getTeam(song.teamId).name}]` : '선택한 곡 없음'}</p>
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
          </div>
          <button type="button" disabled={!canSkip} onClick={skipToCheer}>
            응원가로
          </button>
          <button type="button" disabled={status === 'idle'} onClick={stop}>
            ■ 정지
          </button>
        </div>
      </div>
    </aside>
  )
}
