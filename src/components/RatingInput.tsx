interface Props {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
}

export default function RatingInput({ label, value, min = 1, max = 10, onChange }: Props) {
  const minVal = min === 0 ? 0 : 1
  return (
    <div>
      <label className="label">{label}: <span className="text-indigo-400 font-bold">{value}</span></label>
      <input
        type="range"
        min={minVal}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{minVal}</span>
        <span>{Math.round((minVal + max) / 2)}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
