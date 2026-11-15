//20241476-김도훈-(2026-11-15)
import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header.tsx'
import PlayerPanel from '../components/PlayerPanel.tsx'
import Toast from '../components/Toast.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'

const NEUTRAL = { color: '#374151', onColor: '#FFFFFF' }

export default function AppLayout() {
  const team = useActiveTeam()
  const colors = team ?? NEUTRAL
  const style = { '--team-color': colors.color, '--team-on-color': colors.onColor } as CSSProperties

  return (
    <div className="app" style={style}>
      <Header teamId={team?.id ?? null} />
      <div className="app-body">
        <main className="app-main">
          <Outlet />
        </main>
        <PlayerPanel />
      </div>
      <Toast />
    </div>
  )
}
