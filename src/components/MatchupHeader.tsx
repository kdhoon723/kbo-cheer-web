//20241476-김도훈-(2026-11-16)
import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { getTeam } from '../data/teams.ts'
import type { Matchup, Slot } from '../lib/matchup.ts'
import type { TeamId } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import TeamLogo from './TeamLogo.tsx'
import TeamSheet from './TeamSheet.tsx'

interface Props {
  matchup: Matchup
  onPick: (slot: Slot, teamId: TeamId) => void
}

const SHEET_TITLES: Record<Slot, string> = { current: '팀 고르기', prev: '상대 팀 고르기' }

/** 넓은 화면의 두 팀 이름. 팀 이름을 누르면 그 칸의 팀을 바꾸는 팀 고르기 창이 열린다 */
export default function MatchupHeader({ matchup, onPick }: Props) {
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  // 닫는 움직임 동안 창 제목이 바뀌지 않게 마지막으로 연 칸을 기억한다
  const [sheetSlot, setSheetSlot] = useState<Slot>('current')

  function open(slot: Slot) {
    setSheetSlot(slot)
    setOpenSlot(slot)
  }

  function pick(teamId: TeamId) {
    setOpenSlot(null)
    onPick(sheetSlot, teamId)
  }

  const teamButton = (slot: Slot, teamId: TeamId) => (
    <TapButton
      type="button"
      className="matchup-team"
      aria-label={`${slot === 'current' ? '팀 선택' : '상대 팀 선택'}: ${getTeam(teamId).name}`}
      aria-haspopup="dialog"
      aria-expanded={openSlot === slot}
      onClick={() => open(slot)}
    >
      <TeamLogo teamId={teamId} size={44} />
      <span className="matchup-name">{getTeam(teamId).name}</span>
      <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
    </TapButton>
  )

  return (
    <div className="matchup">
      {teamButton('current', matchup.current)}
      <span className="matchup-vs" aria-hidden="true">
        vs
      </span>
      {matchup.prev ? (
        teamButton('prev', matchup.prev)
      ) : (
        <TapButton
          type="button"
          className="matchup-pick"
          aria-haspopup="dialog"
          aria-expanded={openSlot === 'prev'}
          onClick={() => open('prev')}
        >
          <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
          상대 팀 고르기
        </TapButton>
      )}
      <TeamSheet
        open={openSlot !== null}
        title={SHEET_TITLES[sheetSlot]}
        currentTeamId={matchup[sheetSlot]}
        onClose={() => setOpenSlot(null)}
        onPick={pick}
      />
    </div>
  )
}
