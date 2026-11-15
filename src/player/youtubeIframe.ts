//20241476-김도훈-(2026-11-15)
let scriptEl: HTMLScriptElement | null = null
let apiPromise: Promise<void> | null = null

export function loadYouTubeIframeApi(timeoutMs = 10000): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise
  const p = new Promise<void>((resolve, reject) => {
    let settled = false
    const settle = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (ok) resolve()
      else reject(new Error('youtube-iframe-api'))
    }
    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.()
      settle(true)
    }
    // 시간 초과로 실패해도 스크립트는 남긴다. 늦게 로드되면 다음 시도가 바로 성공하고, 스크립트가 두 개 들어가지 않는다
    if (!scriptEl) {
      scriptEl = document.createElement('script')
      scriptEl.src = 'https://www.youtube.com/iframe_api'
      scriptEl.onerror = () => {
        scriptEl?.remove()
        scriptEl = null
        settle(false)
      }
      document.head.appendChild(scriptEl)
    }
    const timer = setTimeout(() => settle(window.YT?.Player !== undefined), timeoutMs)
  })
  apiPromise = p
  // 늦게 실패한 이전 요청이 새 요청의 apiPromise를 비우지 않게 한다
  p.catch(() => {
    if (apiPromise === p) apiPromise = null
  })
  return p
}
