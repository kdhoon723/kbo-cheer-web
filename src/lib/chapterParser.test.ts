//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { parseDescription } from './chapterParser.ts'

describe('parseDescription', () => {
  it('타임스탬프가 없으면 빈 배열이다', () => {
    expect(parseDescription('')).toEqual([])
    expect(parseDescription('안내 문구\n#해시태그\n-----')).toEqual([])
  })

  it('H:MM:SS 줄과 줄 끝 공백을 처리한다', () => {
    const rows = parseDescription('1:04:38 홍길동 등장곡   \n00:10 볼넷 송  ')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      key: 0,
      lineNo: 0,
      rawLine: '1:04:38 홍길동 등장곡',
      kind: 'player',
      title: '홍길동',
      startText: '1:04:38',
      selection: 'auto',
      inTeamSection: false,
    })
    expect(rows[1]).toMatchObject({ key: 1, kind: 'situation', title: '볼넷 송', startText: '00:10' })
  })

  it('60 이상인 분·초는 챕터로 보지 않는다', () => {
    expect(parseDescription('1:75:00 가\n00:61 나\n00:59 다')).toHaveLength(1)
  })

  it('선수 접미사 두 가지를 모두 떼어낸다', () => {
    const rows = parseDescription('00:10 가나다 등장곡+응원가\n00:20 라마바 등장곡')
    expect(rows.map((r) => [r.kind, r.title])).toEqual([
      ['player', '가나다'],
      ['player', '라마바'],
    ])
  })

  it('마지막 구분선 뒤는 팀 구획이고, 등장곡 줄도 team으로 분류한다', () => {
    const rows = parseDescription(
      ['00:10 볼넷 송', '---', '00:20 선수 등장곡', '---', '01:00 팀 응원가', '01:30 ○○ 등장곡'].join('\n'),
    )
    expect(rows.map((r) => [r.kind, r.inTeamSection])).toEqual([
      ['situation', false],
      ['player', false],
      ['team', true],
      ['team', true],
    ])
    expect(rows[3].title).toBe('○○ 등장곡')
  })

  it('마지막 챕터 뒤의 구분선은 팀 구획을 만들지 않는다', () => {
    const rows = parseDescription('00:10 가 등장곡\n---\n00:20 나\n-----\n#태그')
    expect(rows.map((r) => r.kind)).toEqual(['player', 'team'])
  })

  it('중복 제목도 지우지 않는다', () => {
    expect(parseDescription('00:10 볼넷 송\n00:20 볼넷 송')).toHaveLength(2)
  })
})
