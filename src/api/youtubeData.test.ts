//20241476-김도훈-(2026-11-15)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dataApiAvailability,
  errorMessage,
  fetchVideo,
  searchVideos,
} from './youtubeData.ts'

const TEST_KEY = 'test-key-not-real'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function videoBody(overrides: { duration?: string; ytRating?: string; embeddable?: boolean } = {}) {
  return {
    kind: 'youtube#videoListResponse',
    items: [
      {
        kind: 'youtube#video',
        id: 'dQw4w9WgXcQ',
        snippet: {
          title: '한화 이글스 응원가 모음',
          channelTitle: '응원가 채널',
          description: '00:00 시작\n01:10 노시환 등장곡',
        },
        contentDetails: {
          duration: overrides.duration ?? 'PT1H4M50S',
          contentRating: overrides.ytRating ? { ytRating: overrides.ytRating } : {},
        },
        status: { embeddable: overrides.embeddable ?? true },
      },
    ],
  }
}

function errorBody(code: number, reason: string, detailReason?: string) {
  return {
    error: {
      code,
      message: 'x',
      errors: [{ reason }],
      details: detailReason ? [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: detailReason }] : [],
    },
  }
}

const controller = new AbortController()
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubEnv('VITE_YOUTUBE_API_KEY', TEST_KEY)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('fetchVideo', () => {
  it('정상 응답을 VideoInfo로 바꾼다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, videoBody()))
    const r = await fetchVideo('dQw4w9WgXcQ', controller.signal)
    expect(r).toEqual({
      ok: true,
      data: {
        videoId: 'dQw4w9WgXcQ',
        title: '한화 이글스 응원가 모음',
        channelTitle: '응원가 채널',
        description: '00:00 시작\n01:10 노시환 등장곡',
        duration: 3890,
        embeddable: true,
        ageRestricted: false,
      },
    })
  })

  it('요청 주소에 part, id, key가 들어간다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, videoBody()))
    await fetchVideo('dQw4w9WgXcQ', controller.signal)
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/youtube/v3/videos')
    expect(url.searchParams.get('part')).toBe('snippet,contentDetails,status')
    expect(url.searchParams.get('id')).toBe('dQw4w9WgXcQ')
    expect(url.searchParams.get('key')).toBe(TEST_KEY)
  })

  it('라이브의 P0D는 길이 0이다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, videoBody({ duration: 'P0D' })))
    const r = await fetchVideo('dQw4w9WgXcQ', controller.signal)
    expect(r.ok && r.data.duration).toBe(0)
  })

  it('연령 제한과 퍼가기 금지를 읽는다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, videoBody({ ytRating: 'ytAgeRestricted', embeddable: false })),
    )
    const r = await fetchVideo('dQw4w9WgXcQ', controller.signal)
    expect(r.ok && r.data.ageRestricted).toBe(true)
    expect(r.ok && r.data.embeddable).toBe(false)
  })

  it('items가 비면 notFound이다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }))
    expect(await fetchVideo('AAAAAAAAAAA', controller.signal)).toEqual({ ok: false, error: 'notFound' })
  })

  it('모양이 다른 응답은 unknown이다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [{ id: 'x' }] }))
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({ ok: false, error: 'unknown' })
  })

  it.each([
    ['quotaExceeded', 403, errorBody(403, 'quotaExceeded')],
    ['dailyLimitExceeded', 403, errorBody(403, 'dailyLimitExceeded')],
  ])('403 %s는 quotaExceeded이다', async (_name, status, body) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body))
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({
      ok: false,
      error: 'quotaExceeded',
    })
  })

  it.each(['ACCESS_DENIED', 'API_KEY_HTTP_REFERRER_BLOCKED'])(
    '403 forbidden(%s)은 keyRejected이다',
    async (detail) => {
      fetchMock.mockResolvedValue(jsonResponse(403, errorBody(403, 'forbidden', detail)))
      expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({
        ok: false,
        error: 'keyRejected',
      })
    },
  )

  it('400 API_KEY_INVALID는 keyRejected이다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, errorBody(400, 'badRequest', 'API_KEY_INVALID')))
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({
      ok: false,
      error: 'keyRejected',
    })
  })

  it('그 밖의 오류와 JSON이 아닌 본문은 unknown이다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, errorBody(500, 'backendError')))
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({ ok: false, error: 'unknown' })
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 502 }))
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({ ok: false, error: 'unknown' })
  })

  it('fetch가 TypeError를 던지면 network이고 키가 새지 않는다', async () => {
    fetchMock.mockRejectedValue(new TypeError(`Failed to fetch key=${TEST_KEY}`))
    const r = await fetchVideo('dQw4w9WgXcQ', controller.signal)
    expect(r).toEqual({ ok: false, error: 'network' })
    expect(JSON.stringify(r)).not.toContain(TEST_KEY)
  })

  it('AbortError는 aborted로 돌려준다', async () => {
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'))
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({ ok: false, error: 'aborted' })
  })

  it('키가 없으면 fetch를 부르지 않고 noKey이다', async () => {
    vi.stubEnv('VITE_YOUTUBE_API_KEY', '')
    expect(await fetchVideo('dQw4w9WgXcQ', controller.signal)).toEqual({ ok: false, error: 'noKey' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('searchVideos', () => {
  it('검색 결과를 VideoSearchItem으로 바꾸고 주소 인자를 채운다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [
          {
            id: { kind: 'youtube#video', videoId: 'dQw4w9WgXcQ' },
            snippet: {
              title: '한화 &amp; 롯데 응원가',
              channelTitle: '채널',
              thumbnails: { medium: { url: 'https://i.ytimg.com/m.jpg' } },
            },
          },
        ],
      }),
    )
    const r = await searchVideos('한화 응원가', controller.signal)
    expect(r).toEqual({
      ok: true,
      data: [
        {
          videoId: 'dQw4w9WgXcQ',
          title: '한화 & 롯데 응원가',
          channelTitle: '채널',
          thumbnailUrl: 'https://i.ytimg.com/m.jpg',
        },
      ],
    })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/youtube/v3/search')
    expect(url.searchParams.get('q')).toBe('한화 응원가')
    expect(url.searchParams.get('videoEmbeddable')).toBe('true')
    expect(url.searchParams.get('maxResults')).toBe('10')
    expect(url.searchParams.get('type')).toBe('video')
  })

  it('결과가 없으면 빈 배열이다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }))
    expect(await searchVideos('없음', controller.signal)).toEqual({ ok: true, data: [] })
  })

  it('오류는 같은 규칙으로 분류한다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, errorBody(403, 'quotaExceeded')))
    expect(await searchVideos('x', controller.signal)).toEqual({ ok: false, error: 'quotaExceeded' })
  })
})

describe('dataApiAvailability', () => {
  it('키가 비었거나 공백이면 noKey이다', () => {
    expect(dataApiAvailability({ key: undefined, origin: 'http://localhost:5173' })).toEqual({ ok: false, error: 'noKey' })
    expect(dataApiAvailability({ key: '   ', origin: 'http://localhost:5173' })).toEqual({ ok: false, error: 'noKey' })
  })

  it('허용 출처가 아닌 주소(LAN 주소, 다른 포트)는 lanHost이다', () => {
    expect(dataApiAvailability({ key: 'k', origin: 'http://192.168.0.10:5173' })).toEqual({ ok: false, error: 'lanHost' })
    expect(dataApiAvailability({ key: 'k', origin: 'http://localhost:4173' })).toEqual({ ok: false, error: 'lanHost' })
    expect(dataApiAvailability({ key: 'k', origin: 'http://kbocheer.kdhoon.me' })).toEqual({ ok: false, error: 'lanHost' })
  })

  it('키가 있고 공개 주소, localhost:5173, 127.0.0.1:5173이면 ok이다', () => {
    expect(dataApiAvailability({ key: 'k', origin: 'https://kbocheer.kdhoon.me' })).toEqual({ ok: true })
    expect(dataApiAvailability({ key: 'k', origin: 'http://localhost:5173' })).toEqual({ ok: true })
    expect(dataApiAvailability({ key: 'k', origin: 'http://127.0.0.1:5173' })).toEqual({ ok: true })
  })
})

describe('errorMessage', () => {
  it('설계의 문구를 돌려준다', () => {
    expect(errorMessage('badUrl')).toBe('YouTube 영상 주소를 넣어 주세요')
    expect(errorMessage('notFound')).toBe('영상을 찾을 수 없습니다')
    expect(errorMessage('live')).toBe('라이브 영상은 등록할 수 없습니다')
  })
})
