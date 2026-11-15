//20241476-김도훈-(2026-11-15)
import { usePlayer } from '../context/PlayerContext.tsx'

export default function PlayerHost() {
  const { attachHost } = usePlayer()
  return <div ref={attachHost} className="player-host" />
}
