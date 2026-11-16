//20241476-김도훈-(2026-11-16)
import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import * as m from 'motion/react-m'
import { LYRICS_LICENSE, sourceLabel } from '../lib/lyrics.ts'
import type { Lyric } from '../lib/lyrics.ts'
import { distance, swap } from '../ui/motionTokens.ts'

interface Props {
  lyric: Lyric
  open: boolean
  onToggle: () => void
}

/**
 * 지금 곡의 가사. 처음에는 펼쳐 두고, 접거나 펼친 것은 설정에 남아 다음 곡에도 이어진다 [STEP 3-㉗].
 * 가사 아래에 출처 문서와 라이선스를 쓴다
 */
export default function LyricsBlock({ lyric, open, onToggle }: Props) {
  const bodyId = useId()
  return (
    <section className="lyrics" aria-label="가사">
      <button type="button" className="lyrics-toggle" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        {open ? '가사 접기' : '가사 보기'}
        <ChevronDown className="lyrics-chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <m.div id={bodyId} className="lyrics-body" initial={{ opacity: 0, y: -distance.row }} animate={{ opacity: 1, y: 0 }} transition={swap}>
          <p className="lyrics-text">{lyric.lyrics}</p>
          <p className="lyrics-source">
            출처:{' '}
            <a href={lyric.source} target="_blank" rel="noopener noreferrer">
              {sourceLabel(lyric.source)}
            </a>{' '}
            ·{' '}
            <a href={LYRICS_LICENSE.url} target="_blank" rel="noopener noreferrer license">
              {LYRICS_LICENSE.name}
            </a>
          </p>
        </m.div>
      )}
    </section>
  )
}
