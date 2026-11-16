//20241476-김도훈-(2026-11-16)
import { describe, expect, it } from 'vitest'
import { TEAM_IDS } from '../data/teams.ts'
import { avatarUrl, buildPlayerIndex, cardSubtitle, cutoutUrl, findPlayer, parsePlayers, photoUrl } from './players.ts'
import { makeSong } from './testSongs.ts'

const player = (name: string, extra: object = {}) => ({
  name,
  playerId: name + '-id',
  position: '투수',
  games: 10,
  plateAppearances: 20,
  photo: 'club',
  cutout: true,
  ...extra,
})

const index = buildPlayerIndex(
  parsePlayers({
    season: 2026,
    teams: { hanwha: [player('노시환'), player('김 민'), player('동명'), player('동명')], lg: [player('동명')] },
  }),
)

describe('parsePlayers', () => {
  it('형식이 틀린 선수와 알 수 없는 팀은 건너뛰고 모든 팀 키를 채운다', () => {
    const parsed = parsePlayers({
      teams: { hanwha: [player('가'), { name: '나' }, player('다', { photo: 'x' })], zzz: [player('라')] },
    })
    expect(parsed.hanwha.map((p) => p.name)).toEqual(['가'])
    expect(Object.keys(parsed).sort()).toEqual([...TEAM_IDS].sort())
  })

  it.each([[null], [[]], [{}], [{ teams: [] }]])('구조가 틀리면 빈 팀 목록: %j', (x) => {
    expect(parsePlayers(x).hanwha).toEqual([])
  })
})

describe('findPlayer', () => {
  it('같은 팀의 선수 곡을 이름으로 잇고 공백은 무시한다', () => {
    expect(findPlayer(index, makeSong({ title: '노시환' }))?.playerId).toBe('노시환-id')
    expect(findPlayer(index, makeSong({ title: '김민' }))?.playerId).toBe('김 민-id')
  })

  it('다른 팀·다른 종류의 곡은 잇지 않는다', () => {
    expect(findPlayer(index, makeSong({ title: '노시환', teamId: 'lg' }))).toBeNull()
    expect(findPlayer(index, makeSong({ title: '노시환', kind: 'team' }))).toBeNull()
  })

  it('팀 안에서 이름이 겹치면 잇지 않는다. 다른 팀의 동명은 영향이 없다', () => {
    expect(findPlayer(index, makeSong({ title: '동명' }))).toBeNull()
    expect(findPlayer(index, makeSong({ title: '동명', teamId: 'lg' }))?.playerId).toBe('동명-id')
  })

  it('없는 이름은 null', () => {
    expect(findPlayer(index, makeSong({ title: '없는선수' }))).toBeNull()
  })
})

describe('사진 주소', () => {
  it('사진이 있다고 표시된 선수만 주소를 만든다', () => {
    const p = parsePlayers({ teams: { kt: [player('가'), player('나', { photo: null })] } }).kt
    expect(photoUrl('kt', p[0])).toBe('/players/kt/가-id.jpg')
    expect(photoUrl('kt', p[1])).toBeNull()
    expect(photoUrl('kt', null)).toBeNull()
  })

  it('기본 아바타는 팀 ID로 찾는다', () => {
    expect(avatarUrl('lg')).toBe('/avatars/lg.webp')
  })
})

describe('cutoutUrl', () => {
  it('누끼가 있다고 표시된 선수만 주소를 만든다', () => {
    const p = parsePlayers({ teams: { hanwha: [player('가'), player('나', { cutout: false })] } }).hanwha
    expect(cutoutUrl('hanwha', p[0])).toBe('/players/hanwha/cutout/가-id.webp')
    expect(cutoutUrl('hanwha', p[1])).toBeNull()
    expect(cutoutUrl('hanwha', null)).toBeNull()
  })
})

describe('cardSubtitle', () => {
  const [withPos, noPos] = parsePlayers({ teams: { hanwha: [player('가'), player('나', { position: null })] } }).hanwha

  it('선수 곡은 구단과 포지션, 포지션이 없거나 이어지지 않으면 구단만 쓴다', () => {
    expect(cardSubtitle({ kind: 'player' }, '한화', withPos)).toBe('한화 · 투수')
    expect(cardSubtitle({ kind: 'player' }, '한화', noPos)).toBe('한화')
    expect(cardSubtitle({ kind: 'player' }, '한화', null)).toBe('한화')
  })

  it('선수 곡이 아니면 곡 종류를 쓴다', () => {
    expect(cardSubtitle({ kind: 'team' }, '한화', null)).toBe('한화 · 팀 응원가')
    expect(cardSubtitle({ kind: 'situation' }, '한화', null)).toBe('한화 · 상황')
  })
})
