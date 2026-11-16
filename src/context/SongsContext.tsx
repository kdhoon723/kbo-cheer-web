//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSeedSongs } from '../data/seedSongs.ts'
import { createSongId } from '../lib/id.ts'
import { importOrders } from '../lib/importReview.ts'
import { loadCurrentSongs, loadSongs, saveSongs } from '../lib/storage.ts'
import type { LoadResult } from '../lib/storage.ts'
import type { Song, SongDraft } from '../types.ts'
import { useNotice } from './NoticeContext.tsx'
import { songsReducer } from './songsReducer.ts'

interface SongsContextValue {
  songs: Song[]
  addSong: (draft: SongDraft) => Song
  updateSong: (song: Song) => void
  deleteSong: (id: string) => void
  importSongs: (drafts: SongDraft[]) => number
  replaceAll: (songs: Song[]) => void
}

const SongsContext = createContext<SongsContextValue | null>(null)

const SAVE_FAILED = '저장하지 못했습니다. 새로고침하면 바뀐 내용이 사라질 수 있습니다'

/**
 * 지금 차례로 저장된 곡 목록이 있으면 바로 쓰고, 아니면(처음 방문, 깨짐, 예전 차례) 처음 데이터를 받은 뒤 시작한다.
 * 받는 동안은 아무것도 그리지 않는다(첫 방문에 한 번, 약 15 KB) [STEP 3-㉔]
 */
export function SongsProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotice()
  const [initial, setInitial] = useState<LoadResult<Song[]> | null>(() => {
    const saved = loadCurrentSongs()
    return saved ? { value: saved, status: 'ok' } : null
  })

  useEffect(() => {
    if (initial) return
    let alive = true
    loadSeedSongs().then(
      (seed) => {
        if (alive) setInitial(loadSongs(seed))
      },
      () => {
        if (!alive) return
        notify('처음 데이터를 불러오지 못했습니다. 새로고침해 주세요', 'error')
        setInitial(loadSongs([]))
      },
    )
    return () => {
      alive = false
    }
  }, [initial, notify])

  if (!initial) return null
  return <SongsStore initial={initial}>{children}</SongsStore>
}

function SongsStore({ initial, children }: { initial: LoadResult<Song[]>; children: ReactNode }) {
  const { notify } = useNotice()
  const [state, dispatch] = useReducer(songsReducer, initial.value, (songs) => ({ songs }))
  const { songs } = state
  const loadNoticeShown = useRef(false)
  const saveFailing = useRef(false)

  useEffect(() => {
    if (loadNoticeShown.current) return
    loadNoticeShown.current = true
    if (initial.status === 'corrupt') {
      notify('저장 데이터가 손상되어 초기화했습니다', 'error')
    } else if (initial.status === 'unavailable') {
      saveFailing.current = true
      notify('이 브라우저에서는 저장할 수 없어 새로고침하면 바뀐 내용이 사라집니다', 'error')
    }
  }, [initial.status, notify])

  useEffect(() => {
    if (saveSongs(songs)) {
      saveFailing.current = false
    } else if (!saveFailing.current) {
      saveFailing.current = true
      notify(SAVE_FAILED, 'error')
    }
  }, [songs, notify])

  const addSong = useCallback(
    (draft: SongDraft): Song => {
      const song: Song = { ...draft, id: createSongId(), order: importOrders(songs, [draft])[0] }
      dispatch({ type: 'ADD_SONG', song })
      return song
    },
    [songs],
  )

  const updateSong = useCallback((song: Song) => dispatch({ type: 'UPDATE_SONG', song }), [])
  const deleteSong = useCallback((id: string) => dispatch({ type: 'DELETE_SONG', id }), [])
  const replaceAll = useCallback((next: Song[]) => dispatch({ type: 'REPLACE_ALL', songs: next }), [])

  const importSongs = useCallback(
    (drafts: SongDraft[]): number => {
      if (drafts.length === 0) return 0
      // 여러 구단 영상은 여러 팀에 한 번에 넣는다. 저장할지는 확인 단계에서 곡마다 그 팀 곡과 견줘 정했다 [STEP 3-㉖]
      const orders = importOrders(songs, drafts)
      const added = drafts.map((d, i): Song => ({ ...d, id: createSongId(), order: orders[i] }))
      dispatch({ type: 'IMPORT_SONGS', songs: added })
      return added.length
    },
    [songs],
  )

  const value = useMemo(
    () => ({ songs, addSong, updateSong, deleteSong, importSongs, replaceAll }),
    [songs, addSong, updateSong, deleteSong, importSongs, replaceAll],
  )
  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>
}

export function useSongs(): SongsContextValue {
  const ctx = useContext(SongsContext)
  if (!ctx) throw new Error('useSongs는 SongsProvider 안에서만 쓸 수 있습니다')
  return ctx
}
