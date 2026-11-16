//20241476-김도훈-(2026-11-15)
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { HistoryProvider } from './context/HistoryContext.tsx'
import { NoticeProvider } from './context/NoticeContext.tsx'
import { PlayerProvider } from './context/PlayerContext.tsx'
import { PrefsProvider, usePrefs } from './context/PrefsContext.tsx'
import { SongsProvider } from './context/SongsContext.tsx'
import AppLayout from './layouts/AppLayout.tsx'
import TeamLayout from './layouts/TeamLayout.tsx'
import HomeRedirect from './pages/HomeRedirect.tsx'
import MainPage from './pages/MainPage.tsx'

// 이동 막기(useBlocker, 곡 수정의 저장하지 않은 변경)는 데이터 라우터에서만 동작해 createBrowserRouter로 만든다 [STEP 3-㉓]
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: 'team/:teamId',
        element: <TeamLayout />,
        children: [
          { index: true, element: <MainPage /> },
          // 곡 관리 쪽 화면은 가끔 쓰므로 처음 묶음에서 빼고 그 화면으로 갈 때 받는다 [STEP 3-㉔].
          // 받는 동안은 지금 화면이 그대로 남는다(데이터 라우터는 받은 뒤에 화면을 바꾼다)
          // 곡 목록이 수정 칸을 품는다. 넓은 화면은 목록과 수정 칸을 나란히, 좁은 화면은 하나씩 보인다
          {
            path: 'songs',
            HydrateFallback: NothingYet,
            lazy: () => import('./pages/SongListPage.tsx').then((m) => ({ Component: m.default })),
            children: [
              {
                path: ':songId/edit',
                HydrateFallback: NothingYet,
                lazy: () => import('./pages/SongEditPage.tsx').then((m) => ({ Component: m.default })),
              },
            ],
          },
          { path: 'songs/add', HydrateFallback: NothingYet, lazy: () => import('./pages/ImportPage.tsx').then((m) => ({ Component: m.default })) },
          { path: 'songs/data', HydrateFallback: NothingYet, lazy: () => import('./pages/SongDataPage.tsx').then((m) => ({ Component: m.default })) },
          // 예전 가져오기 주소는 곡 관리 아래 곡 추가로 보낸다
          { path: 'import', element: <Navigate to="../songs/add" replace /> },
        ],
      },
      { path: 'settings', element: <SettingsRedirect /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

/** 곡 관리 주소로 바로 열었을 때 그 화면 파일을 받는 동안의 자리. 뼈대 화면 없이 비워 둔다 */
function NothingYet() {
  return null
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      {/* m.* 컴포넌트는 domAnimation 기능만 싣는다. strict라 실수로 motion.*을 쓰면 바로 오류가 난다 */}
      <LazyMotion features={domAnimation} strict>
        <NoticeProvider>
          <PrefsProvider>
            <HistoryProvider>
              <SongsProvider>
                <PlayerProvider>
                  <RouterProvider router={router} />
                </PlayerProvider>
              </SongsProvider>
            </HistoryProvider>
          </PrefsProvider>
        </NoticeProvider>
      </LazyMotion>
    </MotionConfig>
  )
}

/** 예전 설정 주소는 마지막 팀의 곡 관리 안 백업·초기화로 보낸다. 팀을 고른 적이 없으면 팀 선택 화면이다 [STEP 3-⑱] */
function SettingsRedirect() {
  const { teamState } = usePrefs()
  const teamId = teamState.currentTeamId
  return <Navigate to={teamId ? `/team/${teamId}/songs/data` : '/'} replace />
}
