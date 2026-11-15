//20241476-김도훈-(2026-11-15)
// @types/youtube는 YT 네임스페이스만 선언하고 window 속성은 선언하지 않는다
interface Window {
  YT?: typeof YT
  onYouTubeIframeAPIReady?: () => void
}
