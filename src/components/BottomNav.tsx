import { NavLink } from 'react-router-dom'

type IconName = 'dashboard' | 'calendar' | 'activity' | 'history' | 'settings'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' as const, exact: true },
  { to: '/planning', label: 'Planning', icon: 'calendar' as const },
  { to: '/aujourd-hui', label: "Aujourd'hui", icon: 'activity' as const },
  { to: '/historique', label: 'Historique', icon: 'history' as const },
  { to: '/settings', label: 'Réglages', icon: 'settings' as const },
]

export default function BottomNav() {
  const buildTime = new Date(__BUILD_TIME__).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] left-0 right-0 z-50 pointer-events-none flex justify-center">
        <div className="glass-pill rounded-t-md px-2 py-0.5 text-[10px]">
          Build : {buildTime}
        </div>
      </div>
      <nav className="glass-nav fixed bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-3 right-3 rounded-2xl z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-3 min-w-[60px] min-h-[56px] text-xs transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <NavIcon name={item.icon} />
              <span className="leading-none">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}

function NavIcon({ name }: { name: IconName }) {
  const common = {
    className: 'h-5 w-5 mb-1',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'dashboard') {
    return (
      <svg {...common}>
        <path d="M4 13h6V4H4z" />
        <path d="M14 20h6V4h-6z" />
        <path d="M4 20h6v-3H4z" />
      </svg>
    )
  }

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="3" />
      </svg>
    )
  }

  if (name === 'activity') {
    return (
      <svg {...common}>
        <path d="M22 12h-4l-3 8-6-16-3 8H2" />
      </svg>
    )
  }

  if (name === 'history') {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.6 19.4a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.6 8.6a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.8 1.8 0 0 0 15.4 4.6a1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 9c.38.18.73.43 1 .74.3.34.5.77.5 1.26V11a2 2 0 1 1 0 4h-.09a1.8 1.8 0 0 0-1.41 1Z" />
    </svg>
  )
}
