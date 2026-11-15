//20241476-김도훈-(2026-11-15)
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { NoticeProvider } from './context/NoticeContext.tsx'
import { PlayerProvider } from './context/PlayerContext.tsx'
import { PrefsProvider } from './context/PrefsContext.tsx'
import { SongsProvider } from './context/SongsContext.tsx'
import AppLayout from './layouts/AppLayout.tsx'
import TeamLayout from './layouts/TeamLayout.tsx'
import HomeRedirect from './pages/HomeRedirect.tsx'
import ImportPage from './pages/ImportPage.tsx'
import MainPage from './pages/MainPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import SongEditPage from './pages/SongEditPage.tsx'
import SongListPage from './pages/SongListPage.tsx'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      {/* m.* 컴포넌트는 domAnimation 기능만 싣는다. strict라 실수로 motion.*을 쓰면 바로 오류가 난다 */}
      <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <NoticeProvider>
          <PrefsProvider>
            <SongsProvider>
              <PlayerProvider>
                <Routes>
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<HomeRedirect />} />
                    <Route path="team/:teamId" element={<TeamLayout />}>
                      <Route index element={<MainPage />} />
                      <Route path="songs" element={<SongListPage />} />
                      <Route path="songs/:songId/edit" element={<SongEditPage />} />
                      <Route path="import" element={<ImportPage />} />
                    </Route>
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </PlayerProvider>
            </SongsProvider>
          </PrefsProvider>
        </NoticeProvider>
      </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  )
}
