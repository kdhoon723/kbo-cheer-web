//20241476-김도훈-(2026-11-15)
import { describe, expect, it } from 'vitest'
import { extractVideoId } from './youtubeUrl.ts'

const ID = '0OUzosfuD0s'

describe('extractVideoId', () => {
  it.each([
    ID,
    `https://www.youtube.com/watch?v=${ID}&pp=abc`,
    `https://www.youtube.com/watch?v=${ID}&t=120s`,
    `https://www.youtube.com/watch?v=${ID}&list=PLxxxx`,
    `https://youtu.be/${ID}?si=xxxx`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `youtube.com/embed/${ID}`,
    `  ${ID}  `,
  ])('%s에서 ID를 꺼낸다', (input) => {
    expect(extractVideoId(input)).toBe(ID)
  })

  it.each([
    '',
    '   ',
    'hello',
    'https://vimeo.com/123',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/abc',
    `https://evil.com/watch?v=${ID}`,
  ])('%s는 null이다', (input) => {
    expect(extractVideoId(input)).toBeNull()
  })
})
