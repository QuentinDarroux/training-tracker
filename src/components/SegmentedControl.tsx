interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
}

export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: Props<T>) {
  return (
    <div className={`segmented-control ${className}`}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={value === option.value ? 'segmented-control-active' : ''}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
