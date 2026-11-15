//20241476-김도훈-(2026-11-15)
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header.tsx'
import PlayerPanel from '../components/PlayerPanel.tsx'
import { SituationSlotContext } from '../context/SituationSlotContext.ts'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'

export default function AppLayout() {
  const team = useActiveTeam()
  const [situationSlot, setSituationSlot] = useState<HTMLDivElement | null>(null)

  return (
    <div className="app">
      <Header teamId={team?.id ?? null} />
      <SituationSlotContext.Provider value={situationSlot}>
        <PlayerPanel situationSlotRef={setSituationSlot} />
        <main className="app-main">
          <Outlet />
        </main>
      </SituationSlotContext.Provider>
    </div>
  )
}
