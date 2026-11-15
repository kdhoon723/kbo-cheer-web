//20241476-김도훈-(2026-11-15)
import { useActiveTeam } from '../hooks/useActiveTeam.ts'

export default function ScreenStub({ title }: { title: string }) {
  const team = useActiveTeam()
  return (
    <section>
      <h2>{title}</h2>
      <p>{team ? team.fullName : '팀 없음'}</p>
    </section>
  )
}
