//20241476-김도훈-(2026-11-16)
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { usePrefs } from '../context/PrefsContext.tsx'
import { getTeam } from '../data/teams.ts'
import { LONG_PRESS_MS, MOUSE_DRAG_PX, TOUCH_SLOP_PX, keyMoveTarget, moveTeam } from '../lib/teamOrder.ts'
import type { TeamId } from '../types.ts'
import { PressCell } from '../ui/Press.tsx'
import TeamLogo from './TeamLogo.tsx'

// 끌기를 끝낸 뒤 이 안에 오는 click은 같은 누르기에서 나온 것이라 버린다
const CLICK_AFTER_DRAG_MS = 600
// 터치로 짧게 눌렀는데 이 안에 click이 오지 않으면 직접 고른다
const TAP_FALLBACK_MS = 300

interface Props {
  currentTeamId: TeamId | null
  onPick: (teamId: TeamId) => void
}

interface Drag {
  teamId: TeamId
  pointerId: number
  x: number
  y: number
  el: HTMLElement
  active: boolean
  timer: number | null
  /** 끄는 중의 순서. pointerup은 아직 그려지지 않은 마지막 이동까지 저장해야 해서 상태와 따로 둔다 */
  order: TeamId[]
}

/**
 * 로고 5×2 격자. 짧게 누르면 그 팀을 고르고, 끌면(터치는 길게 누른 뒤 끌면) 순서를 바꿔 저장한다.
 * 키보드는 Alt+방향키로 고른 로고를 옮긴다. 끄는 동안에는 지나가는 칸 자리로 바로 옮겨 그린다
 */
export default function TeamGrid({ currentTeamId, onPick }: Props) {
  const { settings, setTeamOrder } = usePrefs()
  const [draft, setDraft] = useState<TeamId[] | null>(null)
  const [dragging, setDragging] = useState<TeamId | null>(null)
  const [announce, setAnnounce] = useState('')
  const drag = useRef<Drag | null>(null)
  const ignoreClickUntil = useRef(0)
  // 길게 눌러 끈 직후의 짧은 탭에는 브라우저가 click을 만들지 않는 때가 있다. 그래서 터치는 click을 잠깐 기다렸다가
  // 오지 않으면 직접 고른다. 곧바로 고르면 화면이 바뀐 뒤 따라온 click이 새 화면의 버튼을 누를 수 있다
  const tapFallback = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (tapFallback.current !== null) window.clearTimeout(tapFallback.current)
    },
    [],
  )
  const focusAfterMove = useRef<TeamId | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const order = draft ?? settings.teamOrder

  // 순서를 바꾸면 버튼이 DOM에서 옮겨지며 포커스를 잃을 수 있어, 옮긴 로고에 다시 둔다
  useLayoutEffect(() => {
    const id = focusAfterMove.current
    if (!id) return
    focusAfterMove.current = null
    gridRef.current?.querySelector<HTMLElement>(`[data-team-id="${id}"]`)?.focus()
  })

  function clearDrag() {
    const d = drag.current
    if (d?.timer != null) window.clearTimeout(d.timer)
    drag.current = null
    setDragging(null)
    setDraft(null)
  }

  function begin(d: Drag) {
    d.active = true
    d.timer = null
    d.el.setPointerCapture(d.pointerId)
    setDragging(d.teamId)
    setDraft(d.order)
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, teamId: TeamId) {
    if (e.button !== 0 || drag.current) return
    const d: Drag = {
      teamId,
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      el: e.currentTarget,
      active: false,
      timer: null,
      order: settings.teamOrder,
    }
    if (e.pointerType === 'touch') d.timer = window.setTimeout(() => begin(d), LONG_PRESS_MS)
    drag.current = d
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (!d.active) {
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y)
      if (e.pointerType === 'touch') {
        if (moved > TOUCH_SLOP_PX) clearDrag()
      } else if (moved > MOUSE_DRAG_PX) {
        begin(d)
      }
      return
    }
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-team-id]')
    const overId = over?.dataset.teamId
    if (!overId || overId === d.teamId) return
    d.order = moveTeam(d.order, d.order.indexOf(d.teamId), d.order.findIndex((id) => id === overId))
    setDraft(d.order)
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    clearDrag()
    if (d.active) {
      ignoreClickUntil.current = performance.now() + CLICK_AFTER_DRAG_MS
      setTeamOrder(d.order)
      setAnnounce(`${getTeam(d.teamId).name}을(를) ${d.order.indexOf(d.teamId) + 1}번째로 옮겼습니다`)
    } else if (e.pointerType === 'touch') {
      tapFallback.current = window.setTimeout(() => {
        tapFallback.current = null
        onPick(d.teamId)
      }, TAP_FALLBACK_MS)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, teamId: TeamId) {
    if (!e.altKey) return
    const from = order.indexOf(teamId)
    const to = keyMoveTarget(from, e.key, order.length)
    if (to === null) return
    e.preventDefault()
    focusAfterMove.current = teamId
    setTeamOrder(moveTeam(order, from, to))
    setAnnounce(`${getTeam(teamId).name}을(를) ${to + 1}번째로 옮겼습니다`)
  }

  return (
    <>
      <div className="team-grid" ref={gridRef}>
        {order.map((id) => (
          <PressCell
            key={id}
            type="button"
            className={dragging === id ? 'team-cell is-dragging' : 'team-cell'}
            data-team-id={id}
            aria-current={id === currentTeamId ? 'true' : undefined}
            aria-describedby={hintId}
            onPointerDown={(e) => onPointerDown(e, id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={clearDrag}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => onKeyDown(e, id)}
            onClick={() => {
              if (tapFallback.current !== null) {
                window.clearTimeout(tapFallback.current)
                tapFallback.current = null
              }
              if (performance.now() >= ignoreClickUntil.current) onPick(id)
            }}
          >
            <TeamLogo teamId={id} size={44} />
            <span className="team-cell-name">{getTeam(id).name}</span>
          </PressCell>
        ))}
      </div>
      <p id={hintId} className="team-grid-hint">
        길게 누르거나 끌어서 순서를 바꿉니다. 키보드는 Alt+방향키
      </p>
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>
    </>
  )
}
