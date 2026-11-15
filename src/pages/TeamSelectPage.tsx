//20241476-김도훈-(2026-11-15)
import { useNavigate } from 'react-router-dom'
import { TEAMS } from '../data/teams.ts'

export default function TeamSelectPage() {
  const navigate = useNavigate()
  return (
    <section>
      <h2>응원할 팀을 고르세요</h2>
      <div className="team-grid">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="team-button"
            style={{ background: t.color, color: t.onColor }}
            onClick={() => navigate(`/team/${t.id}`)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </section>
  )
}
