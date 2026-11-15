//20241476-김도훈-(2026-11-16)
import type { TeamId } from '../types.ts'
import Sheet from './Sheet.tsx'
import TeamGrid from './TeamGrid.tsx'

interface Props {
  open: boolean
  currentTeamId: TeamId
  onClose: () => void
  onPick: (teamId: TeamId) => void
}

export default function TeamSheet({ open, currentTeamId, onClose, onPick }: Props) {
  return (
    <Sheet
      open={open}
      title="팀 고르기"
      titleId="team-sheet-title"
      className="team-sheet"
      focusSelector='[aria-current="true"]'
      onClose={onClose}
    >
      <TeamGrid currentTeamId={currentTeamId} onPick={onPick} />
    </Sheet>
  )
}
