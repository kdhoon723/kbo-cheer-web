//20241476-김도훈-(2026-11-15)
import { Volume2 } from 'lucide-react'

interface Props {
  value: number
  onChange: (v: number) => void
  supported: boolean
}

export default function VolumeSlider({ value, onChange, supported }: Props) {
  return (
    <div className="volume">
      <label className="volume-label">
        <Volume2 className="narrow-only" size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="wide-only">볼륨</span>
        <input
          type="range"
          aria-label="볼륨"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={!supported}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="volume-value">{value}</span>
      </label>
      {!supported && <p className="volume-note">이 기기에서는 기기 음량 버튼을 써 주세요</p>}
    </div>
  )
}
