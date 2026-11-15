//20241476-김도훈-(2026-11-15)
interface Props {
  value: number
  onChange: (v: number) => void
  supported: boolean
}

export default function VolumeSlider({ value, onChange, supported }: Props) {
  return (
    <div className="volume">
      <label className="volume-label">
        <span>볼륨</span>
        <input
          type="range"
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
