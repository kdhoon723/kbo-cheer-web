//20241476-김도훈-(2026-11-16)
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import type { TeamId } from '../types.ts'
import { TapButton } from '../ui/Press.tsx'
import { distance, exit, spring, swap } from '../ui/motionTokens.ts'
import TeamGrid from './TeamGrid.tsx'

interface Props {
  open: boolean
  currentTeamId: TeamId
  onClose: () => void
  onPick: (teamId: TeamId) => void
}

export default function TeamSheet({ open, currentTeamId, onClose, onPick }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  // 동작 줄이기에서는 옮기기가 순간 이동이 되므로, 닫을 때 아래로 튀지 않게 옮기기를 빼고 사라지기만 한다
  const exitY = useReducedMotionConfig() ? {} : { y: distance.sheet }

  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="team-sheet"
      aria-labelledby="team-sheet-title"
      onClose={onClose}
      // Esc로 바로 닫지 않고 닫는 움직임이 끝난 뒤 close()한다. 포커스는 그때 팀 버튼으로 돌아간다
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // 시트 바깥(::backdrop)을 누르면 대상이 dialog 자신이다
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <AnimatePresence onExitComplete={() => ref.current?.close()}>
        {open && (
          <motion.div
            className="sheet-body"
            initial={{ opacity: 0, y: distance.sheet }}
            animate={{ opacity: 1, y: 0, transition: { y: spring.sheet, opacity: swap } }}
            exit={{ opacity: 0, ...exitY, transition: exit }}
          >
            <div className="sheet-head">
              <h2 id="team-sheet-title">팀 고르기</h2>
              <TapButton type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </TapButton>
            </div>
            <TeamGrid currentTeamId={currentTeamId} onPick={onPick} />
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}
