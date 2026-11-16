//20241476-김도훈-(2026-11-16)
import { buildRankIndex } from '../lib/teamSongSort.ts'
import ranksJson from './team-song-ranks.json'

/** 처음 데이터의 팀 응원가 208곡의 구단 안 인기 순위. 곡 목록과 따로 두어 사용자가 곡을 고쳐도 순위 자료는 그대로다 */
export const TEAM_SONG_RANKS = buildRankIndex(ranksJson)
