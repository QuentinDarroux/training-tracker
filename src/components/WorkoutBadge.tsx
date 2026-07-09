import type { WorkoutType } from '../types'

const colors: Record<WorkoutType, string> = {
  strength: 'text-orange-400',
  running: 'text-blue-400',
  rest: 'text-gray-500',
}

const icons: Record<WorkoutType, string> = {
  strength: '💪',
  running: '🏃',
  rest: '😴',
}

interface Props {
  type: WorkoutType
  title: string
  description?: string
  compact?: boolean
}

export default function WorkoutBadge({ type, title, description, compact }: Props) {
  return (
    <div className={compact ? 'flex items-center gap-2' : ''}>
      <span className="text-base">{icons[type]}</span>
      <div>
        <span className={`font-medium ${colors[type]}`}>{title}</span>
        {!compact && description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  )
}
