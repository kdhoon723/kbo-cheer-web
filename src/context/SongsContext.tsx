//20241476-김도훈-(2026-11-15)
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import seedJson from '../data/seed-songs.json'
import { createSongId } from '../lib/id.ts'
import { loadSongs, saveSongs } from '../lib/storage.ts'
import { parseSongsFile } from '../lib/songsFile.ts'
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
  resetToSeed: () => void
}

const SongsContext = createContext<SongsContextValue | null>(null)

const SAVE_FAILED = '저장하지 못했습니다. 새로고침하면 바뀐 내용이 사라질 수 있습니다'

function readSeed(): Song[] {
  const parsed = parseSongsFile(seedJson, { allowEmpty: true })
  if (parsed.ok) return parsed.songs
  console.error('seed-songs.json 형식이 올바르지 않습니다:', parsed.error)
  return []
}

const SEED = readSeed()

function nextOrder(songs: Song[], teamId: Song['teamId']): number {
  return songs.reduce((max, s) => (s.teamId === teamId ? Math.max(max, s.order) : max), -1) + 1
}

export function SongsProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotice()
  const [initial] = useState(() => loadSongs(SEED))
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
      const song: Song = { ...draft, id: createSongId(), order: nextOrder(songs, draft.teamId) }
      dispatch({ type: 'ADD_SONG', song })
      return song
    },
    [songs],
  )

  const updateSong = useCallback((song: Song) => dispatch({ type: 'UPDATE_SONG', song }), [])
  const deleteSong = useCallback((id: string) => dispatch({ type: 'DELETE_SONG', id }), [])
  const replaceAll = useCallback((next: Song[]) => dispatch({ type: 'REPLACE_ALL', songs: next }), [])
  const resetToSeed = useCallback(() => dispatch({ type: 'REPLACE_ALL', songs: SEED }), [])

  const importSongs = useCallback(
    (drafts: SongDraft[]): number => {
      if (drafts.length === 0) return 0
      const teamId = drafts[0].teamId
      if (drafts.some((d) => d.teamId !== teamId)) throw new Error('가져오기 곡은 모두 같은 팀이어야 합니다')
      const first = nextOrder(songs, teamId)
      const added = drafts.map((d, i): Song => ({ ...d, id: createSongId(), order: first + i }))
      dispatch({ type: 'IMPORT_SONGS', songs: added })
      return added.length
    },
    [songs],
  )

  const value = useMemo(
    () => ({ songs, addSong, updateSong, deleteSong, importSongs, replaceAll, resetToSeed }),
    [songs, addSong, updateSong, deleteSong, importSongs, replaceAll, resetToSeed],
  )
  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>
}

export function useSongs(): SongsContextValue {
  const ctx = useContext(SongsContext)
  if (!ctx) throw new Error('useSongs는 SongsProvider 안에서만 쓸 수 있습니다')
  return ctx
}
