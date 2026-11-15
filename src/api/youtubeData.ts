//20241476-김도훈-(2026-11-15)
import { isDataApiOrigin } from '../lib/env.ts'
import { isRecord } from '../lib/songValidation.ts'
import { parseIsoDuration } from '../lib/time.ts'
import type { VideoInfo, VideoSearchItem } from '../types.ts'

export type DataApiError =
  | 'noKey'
  | 'lanHost'
  | 'keyRejected'
  | 'quotaExceeded'
  | 'network'
  | 'notFound'
  | 'unknown'

export type ImportError = DataApiError | 'badUrl' | 'notEmbeddable' | 'live' | 'ageRestricted'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: DataApiError }

// 요청을 취소하면 AbortError가 난다. 호출한 쪽이 그 결과를 버리도록 오류 분류와 따로 돌려준다
export type AbortedResult = { ok: false; error: 'aborted' }
export type RequestResult<T> = ApiResult<T> | AbortedResult

export interface ApiEnv {
  key: string | undefined
  origin: string
}

const API_BASE = 'https://www.googleapis.com/youtube/v3'

function currentEnv(): ApiEnv {
  return { key: import.meta.env.VITE_YOUTUBE_API_KEY, origin: location.origin }
}

export function dataApiAvailability(
  env: ApiEnv = currentEnv(),
): { ok: true } | { ok: false; error: 'noKey' | 'lanHost' } {
  if (env.key === undefined || env.key.trim() === '') return { ok: false, error: 'noKey' }
  if (!isDataApiOrigin(env.origin)) return { ok: false, error: 'lanHost' }
  return { ok: true }
}

const MESSAGES: Record<ImportError, string> = {
  noKey: 'API 키가 없어 곡 가져오기를 쓸 수 없습니다',
  lanHost:
    '이 주소(LAN 주소)에서는 곡 가져오기를 쓸 수 없습니다. https://kbocheer.kdhoon.me에서 등록하거나 JSON 내보내기·가져오기로 옮겨 주세요',
  keyRejected: 'API 키 설정을 확인해 주세요',
  quotaExceeded: '오늘 YouTube API 사용량을 다 썼습니다. 내일 다시 시도해 주세요',
  network: '네트워크 연결을 확인해 주세요',
  notFound: '영상을 찾을 수 없습니다',
  unknown: 'YouTube 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요',
  badUrl: 'YouTube 영상 주소를 넣어 주세요',
  notEmbeddable: '이 영상은 다른 사이트에서 재생할 수 없어 등록할 수 없습니다',
  live: '라이브 영상은 등록할 수 없습니다',
  ageRestricted: '연령 제한 영상은 이 앱에서 재생되지 않아 등록할 수 없습니다',
}

export function errorMessage(error: ImportError): string {
  return MESSAGES[error]
}

function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'name' in e && e.name === 'AbortError'
}

function reasonsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const items: unknown[] = list
  return items.flatMap((x) => (isRecord(x) && typeof x.reason === 'string' ? [x.reason] : []))
}

function classifyFailure(status: number, body: unknown): DataApiError {
  const err = isRecord(body) && isRecord(body.error) ? body.error : null
  const reasons = err ? [...reasonsOf(err.errors), ...reasonsOf(err.details)] : []
  if (status === 403) {
    if (reasons.includes('quotaExceeded') || reasons.includes('dailyLimitExceeded')) return 'quotaExceeded'
    if (reasons.includes('forbidden')) return 'keyRejected'
  }
  if (status === 400 && (reasons.includes('API_KEY_INVALID') || reasons.includes('keyInvalid'))) {
    return 'keyRejected'
  }
  return 'unknown'
}

async function getJson(
  endpoint: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<RequestResult<unknown>> {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY
  if (key === undefined || key.trim() === '') return { ok: false, error: 'noKey' }
  const query = new URLSearchParams({ ...params, key })
  let response: Response
  try {
    response = await fetch(`${API_BASE}/${endpoint}?${query.toString()}`, { signal })
  } catch (e) {
    return isAbortError(e) ? { ok: false, error: 'aborted' } : { ok: false, error: 'network' }
  }
  let body: unknown
  try {
    body = await response.json()
  } catch (e) {
    if (isAbortError(e)) return { ok: false, error: 'aborted' }
    body = null
  }
  if (!response.ok) return { ok: false, error: classifyFailure(response.status, body) }
  return { ok: true, data: body }
}

function itemsOf(body: unknown): unknown[] | null {
  if (!isRecord(body) || !Array.isArray(body.items)) return null
  const items: unknown[] = body.items
  return items
}

function toVideoInfo(item: unknown): VideoInfo | null {
  if (!isRecord(item) || typeof item.id !== 'string') return null
  const { snippet, contentDetails, status } = item
  if (!isRecord(snippet) || !isRecord(contentDetails) || !isRecord(status)) return null
  if (typeof snippet.title !== 'string' || typeof contentDetails.duration !== 'string') return null
  const duration = parseIsoDuration(contentDetails.duration)
  if (duration === null || typeof status.embeddable !== 'boolean') return null
  const rating = contentDetails.contentRating
  return {
    videoId: item.id,
    title: snippet.title,
    channelTitle: typeof snippet.channelTitle === 'string' ? snippet.channelTitle : '',
    description: typeof snippet.description === 'string' ? snippet.description : '',
    duration,
    embeddable: status.embeddable,
    ageRestricted: isRecord(rating) && rating.ytRating === 'ytAgeRestricted',
  }
}

export async function fetchVideo(
  videoId: string,
  signal: AbortSignal,
): Promise<RequestResult<VideoInfo>> {
  const r = await getJson(
    'videos',
    { part: 'snippet,contentDetails,status', id: videoId },
    signal,
  )
  if (!r.ok) return r
  const items = itemsOf(r.data)
  if (items === null) return { ok: false, error: 'unknown' }
  if (items.length === 0) return { ok: false, error: 'notFound' }
  const video = toVideoInfo(items[0])
  return video ? { ok: true, data: video } : { ok: false, error: 'unknown' }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }

function decodeEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, (_, name: string) => ENTITIES[name])
}

function toSearchItem(item: unknown): VideoSearchItem | null {
  if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) return null
  const { videoId } = item.id
  const { title, channelTitle, thumbnails } = item.snippet
  if (typeof videoId !== 'string' || typeof title !== 'string') return null
  let thumbnailUrl = ''
  if (isRecord(thumbnails)) {
    for (const size of [thumbnails.default, thumbnails.medium]) {
      if (isRecord(size) && typeof size.url === 'string') {
        thumbnailUrl = size.url
        break
      }
    }
  }
  return {
    videoId,
    title: decodeEntities(title),
    channelTitle: typeof channelTitle === 'string' ? decodeEntities(channelTitle) : '',
    thumbnailUrl,
  }
}

export async function searchVideos(
  query: string,
  signal: AbortSignal,
): Promise<RequestResult<VideoSearchItem[]>> {
  const r = await getJson(
    'search',
    { part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '10', q: query },
    signal,
  )
  if (!r.ok) return r
  const items = itemsOf(r.data)
  if (items === null) return { ok: false, error: 'unknown' }
  const data = items.flatMap((x) => {
    const item = toSearchItem(x)
    return item ? [item] : []
  })
  return { ok: true, data }
}
