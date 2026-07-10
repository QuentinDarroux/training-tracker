import { Link } from 'react-router-dom'

interface Props {
  icon: string
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}

export default function EmptyState({ icon, title, description, actionLabel, actionTo }: Props) {
  return (
    <div className="card text-center py-8 space-y-3">
      <div className="text-4xl">{icon}</div>
      <div>
        <p className="font-semibold text-gray-200">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary w-full">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
