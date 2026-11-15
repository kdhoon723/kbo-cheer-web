//20241476-김도훈-(2026-11-16)
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, useReducedMotionConfig } from 'motion/react'
import * as m from 'motion/react-m'
import { TapButton } from '../ui/Press.tsx'
import { distance, exit, spring, swap } from '../ui/motionTokens.ts'

interface Props {
  open: boolean
  title: string
  titleId: string
  className?: string
  /** 열 때 포커스를 줄 요소. 없으면 브라우저가 첫 요소에 준다 */
  focusSelector?: string
  onClose: () => void
  children: ReactNode
}

/** 아래에서 올라오는 판. dialog는 자리만 잡고 보이는 판은 안의 sheet-body다 */
export default function Sheet({ open, title, titleId, className, focusSelector, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  // 동작 줄이기에서는 옮기기가 순간 이동이 되므로, 닫을 때 아래로 튀지 않게 옮기기를 빼고 사라지기만 한다
  const exitY = useReducedMotionConfig() ? {} : { y: distance.sheet }

  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) {
      dialog.showModal()
      if (focusSelector) dialog.querySelector<HTMLElement>(focusSelector)?.focus()
    }
  }, [open, focusSelector])

  return (
    <dialog
      ref={ref}
      className={className ? `sheet ${className}` : 'sheet'}
      aria-labelledby={titleId}
      onClose={onClose}
      // Esc로 바로 닫지 않고 닫는 움직임이 끝난 뒤 close()한다. 포커스는 그때 연 버튼으로 돌아간다
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // 시트 바깥(::backdrop)을 누르면 대상이 dialog 자신이다
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <AnimatePresence onExitComplete={() => ref.current?.close()}>
        {open && (
          <m.div
            className="sheet-body"
            initial={{ opacity: 0, y: distance.sheet }}
            animate={{ opacity: 1, y: 0, transition: { y: spring.sheet, opacity: swap } }}
            exit={{ opacity: 0, ...exitY, transition: exit }}
          >
            <div className="sheet-head">
              <h2 id={titleId}>{title}</h2>
              <TapButton type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </TapButton>
            </div>
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}
