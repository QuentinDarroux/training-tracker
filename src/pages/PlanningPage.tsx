import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import WorkoutBadge from '../components/WorkoutBadge'
import type { WorkoutSession, UserSettings } from '../types'
import { workouts } from '../data/workouts'
import { defaultWeeklyPlan, dayLabels, dayOrder } from '../data/weeklyPlan'
import { today, formatDate, parseLocalDate, toLocalDateString } from '../utils/calc'

interface Props {
  sessions: WorkoutSession[]
  settings: UserSettings | null
  onCreateSession: (session: WorkoutSession) => Promise<void>
}

export default function PlanningPage({ sessions, settings, onCreateSession }: Props) {
  const navigate = useNavigate()
  const weeklyPlan = settings?.weeklyPlan ?? defaultWeeklyPlan
  const [creatingDay, setCreatingDay] = useState<string | null>(null)

  // Get date for each day of the current week
  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0=Sun
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const getDayDate = (index: number): string => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + index)
    return toLocalDateString(d)
  }

  const getSessionForDay = (dateStr: string, workoutId: string): WorkoutSession | undefined => {
    return sessions.find(s => s.date === dateStr && s.workoutId === workoutId)
  }

  const handleDayClick = async (dayIndex: number) => {
    const dayKey = dayOrder[dayIndex]
    const workoutId = weeklyPlan[dayKey]
    const dateStr = getDayDate(dayIndex)
    const workout = workouts.find(w => w.id === workoutId)
    if (!workout || workout.type === 'rest') return

    const existing = getSessionForDay(dateStr, workoutId)
    if (existing) {
      navigate(`/seance/${existing.id}`)
      return
    }

    setCreatingDay(dayKey)
    const newSession: WorkoutSession = {
      id: `${workoutId}-${dateStr}-${Date.now()}`,
      date: dateStr,
      workoutId,
      workoutTitle: workout.title,
      workoutType: workout.type,
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await onCreateSession(newSession)
    setCreatingDay(null)
    navigate(`/seance/${newSession.id}`)
  }

  const todayStr = today()

  return (
    <PageLayout title="Planning de la semaine">
      <div className="space-y-2">
        {dayOrder.map((dayKey, index) => {
          const workoutId = weeklyPlan[dayKey]
          const workout = workouts.find(w => w.id === workoutId)
          const dateStr = getDayDate(index)
          const isToday = dateStr === todayStr
          const existingSession = getSessionForDay(dateStr, workoutId)
          const status = existingSession?.status

          return (
            <div
              key={dayKey}
              onClick={() => workout?.type !== 'rest' && handleDayClick(index)}
              className={`card ${
                workout?.type !== 'rest' ? 'cursor-pointer hover:border-indigo-600 active:scale-[0.99] transition-transform' : ''
              } ${isToday ? 'border-indigo-600 ring-1 ring-indigo-600/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-center min-w-[48px] ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>
                    <div className="text-xs font-medium">{dayLabels[dayKey]}</div>
                    <div className="text-sm text-gray-500">
                      {parseLocalDate(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  {workout && (
                    <WorkoutBadge
                      type={workout.type}
                      title={workout.title}
                      description={workout.description}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {status && (
                    <span className={
                      status === 'done' ? 'badge-done' :
                      status === 'skipped' ? 'badge-skipped' : 'badge-planned'
                    }>
                      {status === 'done' ? '✓ Fait' : status === 'skipped' ? 'Passé' : 'Prévu'}
                    </span>
                  )}
                  {creatingDay === dayKey && <span className="text-xs text-gray-400">...</span>}
                  {workout?.type !== 'rest' && <span className="text-gray-600">›</span>}
                </div>
              </div>
              {existingSession && (
                <div className="mt-2 pt-2 border-t border-gray-700 flex gap-3 text-xs text-gray-500">
                  {existingSession.duration && <span>⏱ {existingSession.duration}min</span>}
                  {existingSession.ressenti !== undefined && <span>😊 {existingSession.ressenti}/10</span>}
                  {existingSession.tflPain !== undefined && <span>🦵 TFL: {existingSession.tflPain}/10</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-600 text-center mt-4">
        {formatDate(getDayDate(0))} — {formatDate(getDayDate(6))}
      </p>
    </PageLayout>
  )
}
