//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { assignTeam as assignSlot } from '../lib/matchup.ts'
import type { Slot } from '../lib/matchup.ts'
import { DEFAULT_SETTINGS, loadSettings, loadTeamState, saveSettings, saveTeamState } from '../lib/storage.ts'
import type { GridSort, Settings, TeamId, TeamSongSort, TeamState } from '../types.ts'
import { useNotice } from './NoticeContext.tsx'

interface PrefsContextValue {
  teamState: TeamState
  visitTeam: (teamId: TeamId) => void
  /** 넓은 화면의 두 팀 열 중 한 칸의 팀을 바꾼다. URL은 부르는 쪽이 맞춘다 */
  assignTeam: (slot: Slot, teamId: TeamId) => void
  settings: Settings
  setVolume: (v: number) => void
  setGridSort: (s: GridSort) => void
  setTeamSort: (s: TeamSongSort) => void
  setTeamOrder: (order: TeamId[]) => void
  setLyricsOpen: (open: boolean) => void
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

const SAVE_FAILED = '설정을 저장하지 못했습니다. 새로고침하면 팀·볼륨·정렬이 이전 값으로 돌아갈 수 있습니다'

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotice()
  const [initialTeam] = useState(() => loadTeamState())
  const [teamState, setTeamState] = useState<TeamState>(initialTeam.value)
  const [settings, setSettings] = useState<Settings>(() => loadSettings().value)
  // 저장소를 아예 쓸 수 없으면 곡 목록 쪽이 이미 알렸으므로 같은 뜻의 알림을 다시 띄우지 않는다.
  // 실패는 다시 성공할 때까지 한 번만 알린다(EX-15)
  const saveFailing = useRef({ team: initialTeam.status === 'unavailable', settings: initialTeam.status === 'unavailable' })

  const report = useCallback(
    (key: 'team' | 'settings', ok: boolean) => {
      if (ok) {
        saveFailing.current[key] = false
      } else if (!saveFailing.current[key]) {
        saveFailing.current[key] = true
        notify(SAVE_FAILED, 'error')
      }
    },
    [notify],
  )

  useEffect(() => {
    report('team', saveTeamState(teamState))
  }, [teamState, report])

  useEffect(() => {
    report('settings', saveSettings(settings))
  }, [settings, report])

  const visitTeam = useCallback((teamId: TeamId) => {
    setTeamState((prev) =>
      prev.currentTeamId === teamId ? prev : { currentTeamId: teamId, prevTeamId: prev.currentTeamId },
    )
  }, [])

  const assignTeam = useCallback((slot: Slot, teamId: TeamId) => {
    setTeamState((prev) => assignSlot(prev, slot, teamId))
  }, [])

  const setVolume = useCallback((v: number) => {
    const volume = Math.min(100, Math.max(0, Math.round(Number.isFinite(v) ? v : DEFAULT_SETTINGS.volume)))
    setSettings((prev) => (prev.volume === volume ? prev : { ...prev, volume }))
  }, [])

  const setGridSort = useCallback((gridSort: GridSort) => {
    setSettings((prev) => (prev.gridSort === gridSort ? prev : { ...prev, gridSort }))
  }, [])

  const setTeamSort = useCallback((teamSort: TeamSongSort) => {
    setSettings((prev) => (prev.teamSort === teamSort ? prev : { ...prev, teamSort }))
  }, [])

  const setTeamOrder = useCallback((teamOrder: TeamId[]) => {
    setSettings((prev) => ({ ...prev, teamOrder }))
  }, [])

  const setLyricsOpen = useCallback((lyricsOpen: boolean) => {
    setSettings((prev) => (prev.lyricsOpen === lyricsOpen ? prev : { ...prev, lyricsOpen }))
  }, [])

  const value = useMemo(
    () => ({ teamState, visitTeam, assignTeam, settings, setVolume, setGridSort, setTeamSort, setTeamOrder, setLyricsOpen }),
    [teamState, visitTeam, assignTeam, settings, setVolume, setGridSort, setTeamSort, setTeamOrder, setLyricsOpen],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs는 PrefsProvider 안에서만 쓸 수 있습니다')
  return ctx
}
