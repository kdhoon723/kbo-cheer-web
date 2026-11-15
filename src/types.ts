//20241476-김도훈-(2026-11-15)

export type TeamId =
  | 'kiwoom' | 'hanwha' | 'lotte' | 'ssg' | 'doosan'
  | 'nc' | 'kia' | 'lg' | 'samsung' | 'kt'

export interface Team {
  id: TeamId
  name: string
  fullName: string
  color: string
  onColor: string
}

export type SongKind = 'player' | 'team' | 'situation'

export interface Song {
  id: string
  teamId: TeamId
  kind: SongKind
  title: string
  videoId: string
  videoDuration: number
  start: number
  end: number
  cheerStart: number | null
  order: number
}

export type SongDraft = Omit<Song, 'id' | 'order'>

export type TeamState =
  | { currentTeamId: null; prevTeamId: null }
  | { currentTeamId: TeamId; prevTeamId: TeamId | null }

export type GridSort = 'chapter' | 'name'

export interface Settings {
  volume: number
  gridSort: GridSort
}

export interface VideoInfo {
  videoId: string
  title: string
  channelTitle: string
  description: string
  duration: number
  embeddable: boolean
  ageRestricted: boolean
}

export interface VideoSearchItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

export interface ImportCandidate {
  key: number
  lineNo: number
  rawLine: string
  inTeamSection: boolean
  kind: SongKind
  title: string
  startText: string
  selection: 'auto' | 'on' | 'off'
}

export type CandidateWarning = 'badTime' | 'outOfRange' | 'timeReversed' | null

export interface CandidateRow extends ImportCandidate {
  start: number | null
  end: number | null
  warning: CandidateWarning
  existing: boolean
  duplicate: boolean
  sameNamePlayer: boolean
  titleError: string | null
  selectable: boolean
  willSave: boolean
}

export interface NowPlaying {
  songId: string
  videoId: string
  start: number
  end: number
}

export interface SongsFile {
  format: 'kbo-cheer-songs'
  version: 1
  exportedAt: string
  songs: Song[]
}
