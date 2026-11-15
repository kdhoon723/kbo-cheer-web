//20241476-김도훈-(2026-11-15)
import { useRef, useState } from 'react'
import { useNotice } from '../context/NoticeContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { createSongsFile, exportFileName, parseSongsFileText } from '../lib/songsFile.ts'

export default function SettingsPage() {
  const { songs, replaceAll, resetToSeed, seedCount } = useSongs()
  const { notify } = useNotice()
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

  return (
    <section className="settings-page">
      <h2>설정</h2>
      <p>현재 곡 {songs.length}곡</p>

      <div className="settings-block">
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

      <div className="settings-block">
        <h3>처음 데이터</h3>
        <button type="button" disabled={busy} onClick={reset}>
          처음 데이터로 되돌리기
        </button>
      </div>

      <div className="settings-block">
        <h3>저장 위치</h3>
        <p>이 브라우저 저장소: {window.location.origin}</p>
        <p>
          접속 주소가 바뀌면 곡 목록이 따로 저장됩니다. 노트북은 항상 localhost:5173으로 열고, 휴대폰은 JSON
          가져오기로 옮겨 주세요. 공유기에서 노트북 IP를 고정하면 편합니다
        </p>
      </div>
    </section>
  )
}
