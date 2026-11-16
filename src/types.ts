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

export type GridSort = 'starters' | 'name' | 'frequent'

export type TeamSongSort = 'popular' | 'name' | 'video'

export type PhotoSource = 'club' | 'kbo'

export interface PlayerInfo {
  name: string
  playerId: string
  position: string | null
  games: number | null
  plateAppearances: number | null
  photo: PhotoSource | null
  cutout: boolean
}

export type PlayersByTeam = Record<TeamId, PlayerInfo[]>

export interface PlayHistory {
  counts: Record<string, number>
  recent: string[]
}

export interface Settings {
  volume: number
  gridSort: GridSort
  teamSort: TeamSongSort
  /** 팀 고르기 로고 순서. 10개 팀이 한 번씩 [STEP 3-⑳] */
  teamOrder: TeamId[]
  /** 가사 칸을 펼쳐 둘지. 처음에는 펼침, 사용자가 접거나 펼친 것을 기억한다 [STEP 3-㉗] */
  lyricsOpen: boolean
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
  /** 여러 구단 영상에서 챕터 이름 앞 구단. 한 팀 영상이면 null(지금 팀) [STEP 3-㉖] */
  teamId: TeamId | null
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
  /** 「이 팀 곡만」으로 볼 때 다른 구단 곡. 고를 수 없다 [STEP 3-㉖] */
  otherTeam: boolean
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

export interface SongFormValues {
  title: string
  kind: SongKind
  startText: string
  endText: string
  cheerStartText: string
}

export interface SongFields {
  title: string
  kind: SongKind
  start: number
  end: number
  cheerStart: number | null
}
