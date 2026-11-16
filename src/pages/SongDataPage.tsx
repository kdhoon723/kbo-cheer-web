//20241476-김도훈-(2026-11-15)
import { useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotice } from '../context/NoticeContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { createSongsFile, exportFileName, parseSongsFileText } from '../lib/songsFile.ts'
import { defaultTeamOrder, isDefaultTeamOrder } from '../lib/teamOrder.ts'

/** 곡 관리 안의 백업·초기화: 곡 목록 옮기기(JSON), 처음 데이터로 되돌리기, 팀 순서 되돌리기, 저장 위치 안내 [STEP 3-⑱] */
export default function SongDataPage() {
  const team = useActiveTeam()
  const { songs, replaceAll, resetToSeed, seedCount } = useSongs()
  const { notify } = useNotice()
  const { settings, setTeamOrder } = usePrefs()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportJson() {
    const now = new Date()
    const text = JSON.stringify(createSongsFile(songs, now), null, 2)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName(now)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify(`${songs.length}곡을 내보냈습니다`)
  }

  async function importJson(file: File) {
    setBusy(true)
    try {
      const parsed = parseSongsFileText(await file.text(), { allowEmpty: false })
      if (!parsed.ok) {
        notify(parsed.error === 'empty' ? '파일에 곡이 없습니다' : '올바른 곡 목록 파일이 아닙니다', 'error')
        return
      }
      const ok = window.confirm(`지금 곡 목록 ${songs.length}곡을 파일의 ${parsed.songs.length}곡으로 바꿉니다`)
      if (!ok) return
      replaceAll(parsed.songs)
      notify(`${parsed.songs.length}곡을 가져왔습니다`)
    } catch {
      notify('파일을 읽지 못했습니다', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
      setBusy(false)
    }
  }

  function reset() {
    const ok = window.confirm(
      `곡 목록을 처음 데이터(${seedCount}곡)로 되돌립니다. 지금 곡 목록과 지정한 응원가 시작 지점이 사라집니다`,
    )
    if (!ok) return
    resetToSeed()
    notify(`처음 데이터(${seedCount}곡)로 되돌렸습니다`)
  }

  if (!team) return null
  return (
    <section className="data-page">
      <Link className="back-link" to={`/team/${team.id}/songs`}>
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        곡 관리
      </Link>
      <h2>백업·초기화</h2>
      <p>현재 곡 {songs.length}곡(10개 구단 전체)</p>

      <div className="data-block">
        <h3>곡 목록 옮기기</h3>
        <div className="button-row">
          <button type="button" disabled={busy} onClick={exportJson}>
            JSON 내보내기
          </button>
        </div>
        <label className="field">
          <span>JSON 가져오기</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importJson(file)
            }}
          />
        </label>
      </div>

      <div className="data-block">
        <h3>처음 데이터</h3>
        <button type="button" disabled={busy} onClick={reset}>
          처음 데이터로 되돌리기
        </button>
      </div>

      <div className="data-block">
        <h3>팀 순서</h3>
        <p>팀 고르기 창의 로고는 길게 누르거나 끌어서 순서를 바꿀 수 있습니다</p>
        <button
          type="button"
          disabled={isDefaultTeamOrder(settings.teamOrder)}
          onClick={() => {
            setTeamOrder(defaultTeamOrder())
            notify('팀 순서를 처음으로 되돌렸습니다')
          }}
        >
          팀 순서 처음으로
        </button>
      </div>

      <div className="data-block">
        <h3>저장 위치</h3>
        <p>이 브라우저 저장소: {window.location.origin}</p>
        <p>
          접속 주소가 바뀌면 곡 목록이 따로 저장됩니다. 늘 같은 주소(https://kbocheer.kdhoon.me)로 열고, 다른
          기기로 옮길 때는 JSON 내보내기·가져오기를 써 주세요
        </p>
      </div>
    </section>
  )
}
