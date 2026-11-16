//20241476-김도훈-(2026-11-15)
import { useRef, useState } from 'react'
import { ArrowLeft, Download, FileUp, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotice } from '../context/NoticeContext.tsx'
import { usePrefs } from '../context/PrefsContext.tsx'
import { useSongs } from '../context/SongsContext.tsx'
import { getTeam } from '../data/teams.ts'
import { useActiveTeam } from '../hooks/useActiveTeam.ts'
import { useSeedSongs } from '../hooks/useSeedSongs.ts'
import { songsPerTeam } from '../lib/importReview.ts'
import { createSongsFile, exportFileName, parseSongsFileText } from '../lib/songsFile.ts'
import { loadLastExport, saveLastExport } from '../lib/storage.ts'
import type { LastExport } from '../lib/storage.ts'
import { defaultTeamOrder, isDefaultTeamOrder } from '../lib/teamOrder.ts'
import type { Song } from '../types.ts'

interface Picked {
  name: string
  songs: Song[]
}

function formatExportedAt(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 곡 관리 안의 백업·초기화 [STEP 3-⑱, 3-㉔].
 * 백업(내보내기, 파일을 골라 미리 본 뒤 바꾸기)과 되돌릴 수 없는 초기화를 나누고, 저장 위치 안내는 맨 아래에 둔다
 */
export default function SongDataPage() {
  const team = useActiveTeam()
  const { songs, replaceAll } = useSongs()
  const seed = useSeedSongs()
  const seedCount = seed?.length ?? null
  const { notify } = useNotice()
  const { settings, setTeamOrder } = usePrefs()
  const [lastExport, setLastExport] = useState<LastExport | null>(() => loadLastExport())
  const [picked, setPicked] = useState<Picked | null>(null)
  const [reading, setReading] = useState(false)
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
    const record = { at: now.toISOString(), count: songs.length }
    saveLastExport(record)
    setLastExport(record)
    notify(`${songs.length}곡을 내보냈습니다`)
  }

  // 파일을 고르면 바로 바꾸지 않고 파일 이름·곡 수·팀별 수를 먼저 보인다. 「이 파일로 바꾸기」가 확인이다(BR-38)
  async function readFile(file: File) {
    setReading(true)
    try {
      const parsed = parseSongsFileText(await file.text(), { allowEmpty: false })
      if (parsed.ok) {
        setPicked({ name: file.name, songs: parsed.songs })
      } else {
        // 잘못된 파일 안내는 예전과 같은 알림이다(EX-21, EX-22)
        setPicked(null)
        notify(parsed.error === 'empty' ? '파일에 곡이 없습니다' : '올바른 곡 목록 파일이 아닙니다', 'error')
      }
    } catch {
      setPicked(null)
      notify('파일을 읽지 못했습니다', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
      setReading(false)
    }
  }

  function applyPicked(next: Song[]) {
    replaceAll(next)
    setPicked(null)
    notify(`${next.length}곡을 가져왔습니다`)
  }

  function reset() {
    if (!seed) return
    const ok = window.confirm(
      `곡 목록을 처음 데이터(${seedCount}곡)로 되돌립니다. 지금 곡 목록과 지정한 응원가 시작 지점이 사라집니다`,
    )
    if (!ok) return
    replaceAll(seed)
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
        <h3>백업</h3>
        <p>곡 목록을 JSON 파일로 저장하거나, 저장해 둔 파일로 지금 곡 목록을 바꿉니다. 다른 기기로 옮길 때도 씁니다</p>
        <div className="data-row">
          <button type="button" onClick={exportJson}>
            <Download size={18} strokeWidth={1.75} aria-hidden="true" />
            JSON 내보내기
          </button>
          <span className="data-note">
            {lastExport
              ? `마지막으로 내보낸 때 ${formatExportedAt(lastExport.at)} · ${lastExport.count}곡`
              : '아직 내보낸 적이 없습니다'}
          </span>
        </div>
        <div className="data-row">
          <button type="button" disabled={reading} onClick={() => fileRef.current?.click()}>
            <FileUp size={18} strokeWidth={1.75} aria-hidden="true" />
            JSON 파일 고르기
          </button>
          <span className="data-note">고르면 먼저 내용을 보여 주고, 확인해야 바뀝니다</span>
          {/* 브라우저 기본 파일 칸(영어 문구)은 그리지 않고 위 버튼으로 연다 */}
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json,.json"
            aria-label="JSON 가져오기"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void readFile(file)
            }}
          />
        </div>
        {picked && (
          <div className="file-preview" role="region" aria-label="가져올 파일">
            <p className="file-preview-name">{picked.name}</p>
            <p>
              {picked.songs.length}곡 · 지금 곡 목록 {songs.length}곡을 이 파일의 곡으로 바꿉니다(합치지 않습니다)
            </p>
            <ul className="file-preview-teams">
              {songsPerTeam(picked.songs).map(({ teamId, count }) => (
                <li key={teamId}>
                  {getTeam(teamId).name} {count}
                </li>
              ))}
            </ul>
            <div className="button-row">
              <button type="button" className="primary-btn" onClick={() => applyPicked(picked.songs)}>
                이 파일로 바꾸기
              </button>
              <button type="button" onClick={() => setPicked(null)}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="data-block">
        <h3>초기화</h3>
        <p>되돌릴 수 없습니다. 필요하면 먼저 백업해 두세요</p>
        <div className="reset-item">
          <button type="button" disabled={!seed} onClick={reset}>
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
            처음 데이터로 되돌리기
          </button>
          <p>
            곡 목록을 처음 데이터{seedCount === null ? '' : `(${seedCount}곡)`}로 바꿉니다. 지금 곡 목록과 직접 정한 응원가 시작 지점이 사라집니다.
            팀 순서와 설정은 그대로입니다
          </p>
        </div>
        <div className="reset-item">
          <button
            type="button"
            disabled={isDefaultTeamOrder(settings.teamOrder)}
            onClick={() => {
              setTeamOrder(defaultTeamOrder())
              notify('팀 순서를 처음으로 되돌렸습니다')
            }}
          >
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
            팀 순서 처음으로
          </button>
          <p>팀 고르기 창의 로고를 처음 순서(키움, 한화, 롯데 …)로 되돌립니다. 곡 목록은 그대로입니다</p>
        </div>
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
