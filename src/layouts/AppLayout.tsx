//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header.tsx'
import PlayerPanel from '../components/PlayerPanel.tsx'
import { SituationSlotContext } from '../context/SituationSlotContext.ts'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'

const NEUTRAL = { color: '#374151', onColor: '#FFFFFF' }

export default function AppLayout() {
  const team = useActiveTeam()
  const [situationSlot, setSituationSlot] = useState<HTMLDivElement | null>(null)
  const colors = team ?? NEUTRAL
  const style = {
    '--team-color': colors.color,
    '--team-on-color': colors.onColor,
    // 팀 메뉴(select)의 기본 화살표와 펼친 목록이 글자 색에 맞는 밝기로 그려지게 한다
    '--team-scheme': colors.onColor === '#FFFFFF' ? 'dark' : 'light',
  } as CSSProperties

  return (
    <div className="app" style={style}>
      <Header teamId={team?.id ?? null} />
      <SituationSlotContext.Provider value={situationSlot}>
        <div className="app-body">
          <PlayerPanel situationSlotRef={setSituationSlot} />
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </SituationSlotContext.Provider>
    </div>
  )
}
