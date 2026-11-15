//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_SETTINGS, loadSettings, loadTeamState, saveSettings, saveTeamState } from '../lib/storage.ts'
import type { GridSort, Settings, TeamId, TeamState } from '../types.ts'

interface PrefsContextValue {
  teamState: TeamState
  visitTeam: (teamId: TeamId) => void
  settings: Settings
  setVolume: (v: number) => void
  setGridSort: (s: GridSort) => void
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [teamState, setTeamState] = useState<TeamState>(() => loadTeamState().value)
  const [settings, setSettings] = useState<Settings>(() => loadSettings().value)

  useEffect(() => {
    saveTeamState(teamState)
  }, [teamState])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const visitTeam = useCallback((teamId: TeamId) => {
    setTeamState((prev) =>
      prev.currentTeamId === teamId ? prev : { currentTeamId: teamId, prevTeamId: prev.currentTeamId },
    )
  }, [])

  const setVolume = useCallback((v: number) => {
    const volume = Math.min(100, Math.max(0, Math.round(Number.isFinite(v) ? v : DEFAULT_SETTINGS.volume)))
    setSettings((prev) => (prev.volume === volume ? prev : { ...prev, volume }))
  }, [])

  const setGridSort = useCallback((gridSort: GridSort) => {
    setSettings((prev) => (prev.gridSort === gridSort ? prev : { ...prev, gridSort }))
  }, [])

  const value = useMemo(
    () => ({ teamState, visitTeam, settings, setVolume, setGridSort }),
    [teamState, visitTeam, settings, setVolume, setGridSort],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs는 PrefsProvider 안에서만 쓸 수 있습니다')
  return ctx
}
