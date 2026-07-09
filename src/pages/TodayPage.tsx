import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import type { WorkoutSession, UserSettings } from '../types'
import { workouts } from '../data/workouts'
import { defaultWeeklyPlan } from '../data/weeklyPlan'
import { today, getDayKey } from '../utils/calc'

interface Props {
  sessions: WorkoutSession[]
  settings: UserSettings | null
  onCreateSession: (session: WorkoutSession) => Promise<void>
}

export default function TodayPage({ sessions, settings, onCreateSession }: Props) {
  const navigate = useNavigate()
  const weeklyPlan = settings?.weeklyPlan ?? defaultWeeklyPlan
  const todayStr = today()
  const dayKey = getDayKey(todayStr) as keyof typeof weeklyPlan
  const workoutId = weeklyPlan[dayKey]
  const workout = workouts.find(w => w.id === workoutId)
  const [creating, setCreating] = useState(false)

  const existingSession = sessions.find(
    s => s.date === todayStr && s.workoutId === workoutId
  )

  const handleStart = async () => {
    if (existingSession) {
      navigate(`/seance/${existingSession.id}`)
      return
    }
    if (!workout || workout.type === 'rest') return
    setCreating(true)
    const newSession: WorkoutSession = {
      id: `${workoutId}-${todayStr}-${Date.now()}`,
      date: todayStr,
      workoutId,
      workoutTitle: workout.title,
      workoutType: workout.type,
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await onCreateSession(newSession)
    setCreating(false)
    navigate(`/seance/${newSession.id}`)
  }

  return (
    <PageLayout title="Aujourd'hui">
      <div className="py-2">
        <p className="text-sm text-gray-400 mb-4">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {!workout || workout.type === 'rest' ? (
          <div className="card text-center py-8">
            <div className="text-4xl mb-3">😴</div>
            <div className="text-lg font-medium text-gray-300">Repos</div>
            <p className="text-sm text-gray-500 mt-1">C'est votre jour de récupération. Profitez-en !</p>
          </div>
        ) : (
          <div>
            <div className="card mb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold">{workout.title}</h2>
                  <p className="text-sm text-gray-400 mt-1">{workout.description}</p>
                </div>
                <span className={
                  workout.type === 'strength' ? 'text-2xl' : 'text-2xl'
                }>
                  {workout.type === 'strength' ? '💪' : '🏃'}
                </span>
              </div>

              {existingSession && (
                <div className={`mt-3 pt-3 border-t border-gray-700`}>
                  <span className={
                    existingSession.status === 'done' ? 'badge-done' :
                    existingSession.status === 'skipped' ? 'badge-skipped' : 'badge-planned'
                  }>
                    {existingSession.status === 'done' ? '✓ Séance complétée' :
                     existingSession.status === 'skipped' ? 'Séance passée' : 'Séance prévue'}
                  </span>
                  {existingSession.ressenti !== undefined && (
                    <span className="ml-2 text-sm text-gray-400">Ressenti: {existingSession.ressenti}/10</span>
                  )}
                </div>
              )}

              {workout.exercises.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Exercices prévus :</p>
                  <div className="space-y-1">
                    {workout.exercises.map(ex => (
                      <div key={ex.id} className="text-sm text-gray-300">
                        • {ex.name} — {ex.sets}x{ex.reps}{ex.unit === 'seconds' ? 's' : ''}
                        {ex.side === 'unilateral' ? '/jambe' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={creating}
              className="btn-primary w-full py-3 text-base"
            >
              {creating ? '...' :
               existingSession ? '✏️ Modifier la séance' : '▶️ Démarrer la séance'}
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
