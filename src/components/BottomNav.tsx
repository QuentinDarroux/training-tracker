import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/planning', label: 'Planning', icon: '📅' },
  { to: '/aujourd-hui', label: "Aujourd'hui", icon: '🏃' },
  { to: '/historique', label: 'Historique', icon: '📋' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
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
      <div className="fixed bottom-14 left-0 right-0 z-50 pointer-events-none flex justify-center">
        <div className="rounded-t-md bg-gray-900/95 border border-b-0 border-gray-700 px-2 py-0.5 text-[10px] text-gray-500">
          Build : {buildTime}
        </div>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50 safe-area-inset-bottom">
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
              <span className="text-xl leading-none mb-0.5">{item.icon}</span>
              <span className="leading-none">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
