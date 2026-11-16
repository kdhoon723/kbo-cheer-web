//20241476-김도훈-(2026-11-16)
import type { TeamId } from '../types.ts'
import Sheet from './Sheet.tsx'
import TeamGrid from './TeamGrid.tsx'

interface Props {
  open: boolean
  /** 창 제목. 넓은 화면의 오른쪽 칸은 「상대 팀 고르기」다 */
  title?: string
  currentTeamId: TeamId | null
  onClose: () => void
  onPick: (teamId: TeamId) => void
}

export default function TeamSheet({ open, title = '팀 고르기', currentTeamId, onClose, onPick }: Props) {
  return (
    <Sheet
      open={open}
      title={title}
      titleId="team-sheet-title"
      className="team-sheet"
      focusSelector='[aria-current="true"]'
      onClose={onClose}
    >
      <TeamGrid currentTeamId={currentTeamId} onPick={onPick} />
    </Sheet>
  )
}
