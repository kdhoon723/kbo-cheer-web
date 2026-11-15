//20241476-김도훈-(2026-11-15)
import type { Song } from '../types.ts'

export interface SongsState {
  songs: Song[]
}

export type SongsAction =
  | { type: 'ADD_SONG'; song: Song }
  | { type: 'UPDATE_SONG'; song: Song }
  | { type: 'DELETE_SONG'; id: string }
  | { type: 'IMPORT_SONGS'; songs: Song[] }
  | { type: 'REPLACE_ALL'; songs: Song[] }

export function songsReducer(state: SongsState, action: SongsAction): SongsState {
  switch (action.type) {
    case 'ADD_SONG':
      return { songs: [...state.songs, action.song] }
    case 'UPDATE_SONG':
      return { songs: state.songs.map((s) => (s.id === action.song.id ? action.song : s)) }
    case 'DELETE_SONG':
      return { songs: state.songs.filter((s) => s.id !== action.id) }
    case 'IMPORT_SONGS':
      return { songs: [...state.songs, ...action.songs] }
    case 'REPLACE_ALL':
      return { songs: action.songs }
  }
}
