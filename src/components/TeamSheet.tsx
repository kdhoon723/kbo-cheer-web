//20241476-김도훈-(2026-11-16)
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { TeamId } from '../types.ts'
import TeamGrid from './TeamGrid.tsx'

interface Props {
  open: boolean
  currentTeamId: TeamId
  onClose: () => void
  onPick: (teamId: TeamId) => void
}

export default function TeamSheet({ open, currentTeamId, onClose, onPick }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="team-sheet"
      aria-labelledby="team-sheet-title"
      onClose={onClose}
      // 시트 바깥(::backdrop)을 누르면 대상이 dialog 자신이다
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-head">
            <h2 id="team-sheet-title">팀 고르기</h2>
            <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <TeamGrid currentTeamId={currentTeamId} onPick={onPick} />
        </div>
      )}
    </dialog>
  )
}
