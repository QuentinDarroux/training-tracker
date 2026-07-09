import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import WorkoutBadge from '../components/WorkoutBadge'
import type { DatedPlanEntry, Workout, WorkoutSession, UserSettings } from '../types'
import { formatDate, getWeekStart, parseLocalDate, today, toLocalDateString } from '../utils/calc'
import {
  getAllPlanEntries,
  getPlanEntriesForWeek,
  planEntryId,
} from '../services/trainingConfigService'

interface Props {
  sessions: WorkoutSession[]
  settings: UserSettings | null
  workouts: Workout[]
  onCreateSession: (session: WorkoutSession) => Promise<void>
}

type PlanningTab = 'week' | 'all'

export default function PlanningPage({ sessions, settings, workouts, onCreateSession }: Props) {
  const navigate = useNavigate()
  const [creatingEntryId, setCreatingEntryId] = useState<string | null>(null)
  const [tab, setTab] = useState<PlanningTab>('week')
  const [weekStartDate, setWeekStartDate] = useState(getWeekStart(today()))

  const entries = tab === 'week'
    ? getPlanEntriesForWeek(settings, weekStartDate)
    : getAllPlanEntries(settings)
  const todayStr = today()
  const weekEndDate = (() => {
    const end = parseLocalDate(weekStartDate)
    end.setDate(end.getDate() + 6)
    return toLocalDateString(end)
  })()

  const shiftWeek = (delta: number) => {
    const start = parseLocalDate(weekStartDate)
    start.setDate(start.getDate() + (delta * 7))
    setWeekStartDate(toLocalDateString(start))
  }

  const getSessionForEntry = (entry: DatedPlanEntry): WorkoutSession | undefined => {
    const entryId = planEntryId(entry)
    return sessions.find(s =>
      s.planEntryId === entryId
      || (!s.planEntryId && s.date === entry.date && s.workoutId === entry.workoutId)
    )
  }

  const handleEntryClick = async (entry: DatedPlanEntry) => {
    const entryId = planEntryId(entry)
    const workout = workouts.find(w => w.id === entry.workoutId)
    if (!workout || workout.type === 'rest') return

    const existing = getSessionForEntry(entry)
    if (existing) {
      navigate(`/seance/${existing.id}`)
      return
    }

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
    <PageLayout title="Planning">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('week')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Semaine
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Tout le programme
        </button>
      </div>

      {tab === 'week' && (
        <div className="flex items-center justify-between mb-4 text-sm">
          <button onClick={() => shiftWeek(-1)} className="btn-secondary py-1 px-3">
            ←
          </button>
          <div className="text-gray-400">
            {formatDate(weekStartDate)} — {formatDate(weekEndDate)}
          </div>
          <button onClick={() => shiftWeek(1)} className="btn-secondary py-1 px-3">
            →
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card text-center py-8 text-gray-500">
          Aucun entraînement planifié.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const entryId = planEntryId(entry)
            const workout = workouts.find(w => w.id === entry.workoutId)
            const isToday = entry.date === todayStr
            const existingSession = getSessionForEntry(entry)
            const status = existingSession?.status

            return (
              <div
                key={entryId}
                onClick={() => workout?.type !== 'rest' && handleEntryClick(entry)}
                className={`card ${
                  workout?.type !== 'rest' ? 'cursor-pointer hover:border-indigo-600 active:scale-[0.99] transition-transform' : ''
                } ${isToday ? 'border-indigo-600 ring-1 ring-indigo-600/30' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`text-center min-w-[76px] ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>
                      <div className="text-xs font-medium">{formatDate(entry.date)}</div>
                      <div className="text-sm text-gray-500">{entry.label}</div>
                    </div>
                    {workout ? (
                      <WorkoutBadge
                        type={workout.type}
                        title={workout.title}
                        description={workout.description}
                      />
                    ) : (
                      <div className="text-sm text-red-300">Workout introuvable: {entry.workoutId}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {status && (
                      <span className={
                        status === 'done' ? 'badge-done' :
                        status === 'skipped' ? 'badge-skipped' : 'badge-planned'
                      }>
                        {status === 'done' ? '✓ Fait' : status === 'skipped' ? 'Passé' : 'Prévu'}
                      </span>
                    )}
                    {creatingEntryId === entryId && <span className="text-xs text-gray-400">...</span>}
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
      )}
    </PageLayout>
  )
}
