//20241476-김도훈-(2026-11-16)
import { getTeam } from '../data/teams.ts'
import type { TeamCount } from '../lib/importReview.ts'
import type { Team } from '../types.ts'
import TeamLogo from './TeamLogo.tsx'

interface Props {
  teams: TeamCount[]
  team: Team
  split: boolean
  onSplit: (split: boolean) => void
  disabled: boolean
}

/**
 * 여러 구단 곡이 섞인 영상 안내 [STEP 3-㉖]. 구단별 곡 수를 보이고, 지금 팀 곡만 넣을지 구단별로 나눠 넣을지 고른다.
 * 처음에는 「이 팀 곡만」이다. 다른 아홉 팀 곡 목록까지 바꾸는 일은 사람이 직접 골라야 한다
 */
export default function TeamSplitNotice({ teams, team, split, onSplit, disabled }: Props) {
  const total = teams.reduce((n, t) => n + t.count, 0)
  const own = teams.find((t) => t.teamId === team.id)?.count ?? 0
  return (
    <section className="team-split" aria-label="여러 구단 영상">
      <p className="team-split-title">
        {teams.length}개 구단 곡이 섞인 영상입니다 · {total}곡
      </p>
      <p className="team-split-text">챕터 이름 앞의 구단 이름으로 곡마다 구단을 알아보고, 곡 이름에서 구단 이름을 뗐습니다</p>
      <ul className="team-split-counts">
        {teams.map((t) => (
          <li key={t.teamId}>
            <TeamLogo teamId={t.teamId} size={28} />
            {getTeam(t.teamId).name} {t.count}
          </li>
        ))}
      </ul>
      <div className="choice-toggle" role="group" aria-label="넣을 곳">
        <button type="button" aria-pressed={!split} disabled={disabled} onClick={() => onSplit(false)}>
          {team.name} 곡만
        </button>
        <button type="button" aria-pressed={split} disabled={disabled} onClick={() => onSplit(true)}>
          구단별로 나눠 넣기
        </button>
      </div>
      <p className="team-split-text">
        {split
          ? '곡마다 그 구단의 곡 관리에 넣습니다. 그 구단에 이미 있는 곡은 빠집니다'
          : `${team.name} ${own}곡만 넣습니다. 다른 구단 ${total - own}곡은 목록에 보이지만 저장하지 않습니다`}
      </p>
    </section>
  )
}
