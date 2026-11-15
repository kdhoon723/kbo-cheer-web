//20241476-김도훈-(2026-11-15)
import { useNavigate } from 'react-router-dom'
import TeamGrid from '../components/TeamGrid.tsx'

export default function TeamSelectPage() {
  const navigate = useNavigate()
  return (
    <section className="team-select-page">
      <h2>응원할 팀을 고르세요</h2>
      <TeamGrid currentTeamId={null} onPick={(id) => navigate(`/team/${id}`)} />
    </section>
  )
}
