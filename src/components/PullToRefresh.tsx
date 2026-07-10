import { useState, type ReactNode, type TouchEvent } from 'react'

const REFRESH_THRESHOLD = 78
const MAX_PULL = 112

interface Props {
  children: ReactNode
}

export default function PullToRefresh({ children }: Props) {
  const [startY, setStartY] = useState<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const canStartPull = (target: EventTarget) => {
    if (window.scrollY > 0 || refreshing) return false
    if (!(target instanceof HTMLElement)) return true
    return !target.closest('input, textarea, select, button, [role="button"]')
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!canStartPull(event.target)) return
    setStartY(event.touches[0]?.clientY ?? null)
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (startY === null || refreshing) return
    const currentY = event.touches[0]?.clientY
    if (currentY === undefined) return

    const delta = currentY - startY
    if (delta <= 0 || window.scrollY > 0) {
      setPullDistance(0)
      return
    }

    event.preventDefault()
    setPullDistance(Math.min(MAX_PULL, delta * 0.45))
  }

  const handleTouchEnd = () => {
    if (refreshing) return
    if (pullDistance >= REFRESH_THRESHOLD) {
      void refreshApp()
      return
    }
    setStartY(null)
    setPullDistance(0)
  }

  const refreshApp = async () => {
    setRefreshing(true)
    setPullDistance(REFRESH_THRESHOLD)
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        await registration?.update()
      }
    } finally {
      window.location.reload()
    }
  }

  const progress = Math.min(1, pullDistance / REFRESH_THRESHOLD)
  const isReady = pullDistance >= REFRESH_THRESHOLD

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="min-h-screen"
    >
      <div
        className={`pull-refresh-indicator ${pullDistance > 0 || refreshing ? 'pull-refresh-visible' : ''}`}
        style={{ transform: `translate(-50%, ${Math.max(-54, pullDistance - 54)}px)` }}
        aria-live="polite"
      >
        <div
          className={`pull-refresh-spinner ${refreshing ? 'pull-refresh-spinning' : ''}`}
          style={{ transform: `rotate(${progress * 270}deg)` }}
        />
        <span>
          {refreshing ? 'Rechargement...' : isReady ? 'Relâche pour recharger' : 'Tire pour recharger'}
        </span>
      </div>
      <div
        style={{ transform: `translateY(${pullDistance}px)` }}
        className={pullDistance > 0 ? 'transition-none' : 'transition-transform duration-200 ease-out'}
      >
        {children}
      </div>
    </div>
  )
}
