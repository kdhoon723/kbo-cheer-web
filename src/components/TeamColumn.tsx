//20241476-김도훈-(2026-11-16)
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { getTeam } from '../data/teams.ts'
import { playerOf } from '../data/players.ts'
import { TEAM_SONG_RANKS } from '../data/teamSongRanks.ts'
import type { SwitchDirection } from '../lib/motion.ts'
import { sortPlayerSongs } from '../lib/playerSort.ts'
import { sortTeamSongs } from '../lib/teamSongSort.ts'
import type { GridSort, Song, TeamId, TeamSongSort } from '../types.ts'
import { distance, swap } from '../ui/motionTokens.ts'
import EmptyState from './EmptyState.tsx'
import PlayerGrid from './PlayerGrid.tsx'
import TeamSongList from './TeamSongList.tsx'

type Tab = 'players' | 'team'

interface Props {
  teamId: TeamId
  songs: Song[]
  /** 탭·패널 id 앞에 붙인다. 한 화면에 열이 둘이면 겹치지 않게 한다 */
  idPrefix: string
  sort: GridSort
  teamSort: TeamSongSort
  /** 「자주 튼」 순서를 정할 때 찍어 둔 횟수 */
  sortCounts: Readonly<Record<string, number>>
  /** 칸에 「N번」으로 보일 지금 횟수. 없으면 보이지 않는다 */
  counts?: Readonly<Record<string, number>>
  nowPlayingId: string | null
  enterFrom: SwitchDirection
  /** 선수 탭일 때 탭 줄 오른쪽에 놓을 정렬 버튼 */
  sortControl?: ReactNode
  /** 팀 응원가 탭일 때 탭 줄 오른쪽에 놓을 정렬 버튼 */
  teamSortControl: ReactNode
  onPlay: (song: Song) => void
}

/** 한 팀의 「선수 | 팀 응원가」 탭과 격자·목록 */
export default function TeamColumn({
  teamId,
  songs,
  idPrefix,
  sort,
  teamSort,
  sortCounts,
  counts,
  nowPlayingId,
  enterFrom,
  sortControl,
  teamSortControl,
  onPlay,
}: Props) {
  const [tab, setTab] = useState<Tab>('players')
  const { players, teamSongs, isEmpty } = useMemo(() => {
    const mine = songs.filter((s) => s.teamId === teamId)
    const byOrder = (kind: Song['kind']) => mine.filter((s) => s.kind === kind).sort((a, b) => a.order - b.order)
    const players = sortPlayerSongs(byOrder('player'), sort, { playerOf, counts: sortCounts })
    const teamSongs = sortTeamSongs(byOrder('team'), teamSort, TEAM_SONG_RANKS)
    return { players, teamSongs, isEmpty: mine.length === 0 }
  }, [songs, teamId, sort, teamSort, sortCounts])

  if (isEmpty) return <EmptyState teamId={teamId} />
  const id = (name: string) => idPrefix + name
  return (
    <>
      <div className="tab-bar">
        <div className="tabs" role="tablist" aria-label={idPrefix ? `${getTeam(teamId).name} 곡 종류` : '곡 종류'}>
          <button
            type="button"
            role="tab"
            id={id('tab-players')}
            aria-selected={tab === 'players'}
            aria-controls={id('panel-songs')}
            onClick={() => setTab('players')}
          >
            선수 <span className="count">{players.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id={id('tab-team')}
            aria-selected={tab === 'team'}
            aria-controls={id('panel-songs')}
            onClick={() => setTab('team')}
          >
            팀 응원가 <span className="count">{teamSongs.length}</span>
          </button>
        </div>
        {tab === 'players' ? sortControl : teamSortControl}
      </div>
      <m.div
        id={id('panel-songs')}
        role="tabpanel"
        aria-labelledby={id(tab === 'players' ? 'tab-players' : 'tab-team')}
        initial={enterFrom === 0 ? false : { x: enterFrom * distance.team, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={swap}
      >
        {tab === 'players' ? (
          <PlayerGrid songs={players} nowPlayingId={nowPlayingId} counts={counts} onPlay={onPlay} />
        ) : (
          <TeamSongList songs={teamSongs} nowPlayingId={nowPlayingId} onPlay={onPlay} />
        )}
      </m.div>
    </>
  )
}
