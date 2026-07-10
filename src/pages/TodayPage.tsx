import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import EmptyState from '../components/EmptyState'
import type { DatedPlanEntry, Workout, WorkoutSession, UserSettings } from '../types'
import { today } from '../utils/calc'
import { getPlanEntriesForDate, planEntryId } from '../services/trainingConfigService'

interface Props {
  sessions: WorkoutSession[]
  settings: UserSettings | null
  workouts: Workout[]
  onCreateSession: (session: WorkoutSession) => Promise<void>
}

export default function TodayPage({ sessions, settings, workouts, onCreateSession }: Props) {
  const navigate = useNavigate()
  const todayStr = today()
  const entries = getPlanEntriesForDate(settings, todayStr)
  const [creatingEntryId, setCreatingEntryId] = useState<string | null>(null)

  const getSessionForEntry = (entry: DatedPlanEntry): WorkoutSession | undefined => {
    const entryId = planEntryId(entry)
    return sessions.find(s =>
      s.planEntryId === entryId
      || (!s.planEntryId && s.date === entry.date && s.workoutId === entry.workoutId)
    )
  }

  const handleStart = async (entry: DatedPlanEntry) => {
    const entryId = planEntryId(entry)
    const existingSession = getSessionForEntry(entry)
    if (existingSession) {
      navigate(`/seance/${existingSession.id}`)
      return
    }

    const workout = workouts.find(w => w.id === entry.workoutId)
    if (!workout || workout.type === 'rest') return
    setCreatingEntryId(entryId)
    const newSession: WorkoutSession = {
      id: `${entryId}-${Date.now()}`,
      date: entry.date,
      workoutId: entry.workoutId,
      workoutTitle: workout.title,
      workoutType: workout.type,
      planEntryId: entryId,
      planLabel: entry.label,
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await onCreateSession(newSession)
    setCreatingEntryId(null)
    navigate(`/seance/${newSession.id}`)
  }

  return (
    <PageLayout title="Aujourd'hui">
      <div className="py-2">
        <p className="text-sm text-gray-400 mb-4">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {entries.length === 0 && (
          <EmptyState
            icon="🌤️"
            title="Rien de prévu aujourd’hui"
            description="Consulte le planning complet ou applique une nouvelle configuration si tu attendais une séance."
            actionLabel="Voir le planning"
            actionTo="/planning"
          />
        )}

        <div className="space-y-3">
          {entries.map(entry => {
            const entryId = planEntryId(entry)
            const workout = workouts.find(w => w.id === entry.workoutId)
            const existingSession = getSessionForEntry(entry)

            if (!workout || workout.type === 'rest') {
              return (
                <div key={entryId} className="card text-center py-6">
                  <div className="text-4xl mb-3">😴</div>
                  <div className="text-lg font-medium text-gray-300">{entry.label}</div>
                  <p className="text-sm text-gray-500 mt-1">{workout?.description ?? 'Repos'}</p>
                </div>
              )
            }

            return (
              <div key={entryId}>
                <div className="card mb-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-indigo-300 mb-1">{entry.label}</div>
                      <h2 className="text-xl font-bold">{workout.title}</h2>
                      <p className="text-sm text-gray-400 mt-1">{workout.description}</p>
                    </div>
                    <span className="text-2xl">
                      {workout.type === 'strength' ? '💪' : '🏃'}
                    </span>
                  </div>

                  {existingSession && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
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
                            • {ex.name} — {ex.sets}x{ex.reps}{ex.unit === 'seconds' ? 's' : ex.unit === 'minutes' ? 'min' : ''}
                            {ex.side === 'unilateral' ? '/jambe' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleStart(entry)}
                  disabled={creatingEntryId === entryId}
                  className="btn-primary w-full py-3 text-base"
                >
                  {creatingEntryId === entryId ? '...' :
                   existingSession ? '✏️ Modifier la séance' : '▶️ Démarrer la séance'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </PageLayout>
  )
}
