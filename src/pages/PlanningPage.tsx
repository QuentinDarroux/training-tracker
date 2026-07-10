import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import WorkoutBadge from '../components/WorkoutBadge'
import EmptyState from '../components/EmptyState'
import SegmentedControl from '../components/SegmentedControl'
import type { DatedPlanEntry, Workout, WorkoutSession, UserSettings, WorkoutType } from '../types'
import { formatDate, getWeekStart, parseLocalDate, today, toLocalDateString } from '../utils/calc'
import { formatGoalHeadline } from '../utils/goals'
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
  onUpdateSettings: (settings: UserSettings) => Promise<void>
}

type PlanningTab = 'week' | 'all'
type FrequencyMode = 'unique' | 'recurring'
type WorkoutSource = 'catalog' | 'custom'

export default function PlanningPage({ sessions, settings, workouts, onCreateSession, onUpdateSettings }: Props) {
  const navigate = useNavigate()
  const [creatingEntryId, setCreatingEntryId] = useState<string | null>(null)
  const [tab, setTab] = useState<PlanningTab>('week')
  const [weekStartDate, setWeekStartDate] = useState(getWeekStart(today()))
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [addMessage, setAddMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [workoutSource, setWorkoutSource] = useState<WorkoutSource>('catalog')
  const [newWorkoutId, setNewWorkoutId] = useState('')
  const [customWorkoutTitle, setCustomWorkoutTitle] = useState('')
  const [customWorkoutType, setCustomWorkoutType] = useState<WorkoutType>('running')
  const [customWorkoutDescription, setCustomWorkoutDescription] = useState('')
  const [newDate, setNewDate] = useState(today())
  const [newLabel, setNewLabel] = useState('Séance')
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>('unique')
  const [everyDays, setEveryDays] = useState(7)
  const [occurrences, setOccurrences] = useState(4)

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

  const showAddMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setAddMessage({ text, type })
    setTimeout(() => setAddMessage(null), 4000)
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
      planGoals: entry.goals,
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await onCreateSession(newSession)
    setCreatingEntryId(null)
    navigate(`/seance/${newSession.id}`)
  }

  const handleAddPlanEntries = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) {
      showAddMsg('Réglages indisponibles.', 'error')
      return
    }

    const customTitle = customWorkoutTitle.trim()
    const customDescription = customWorkoutDescription.trim()
    const customWorkout: Workout | null = workoutSource === 'custom'
      ? {
          id: uniqueWorkoutId(slugify(customTitle || 'entrainement'), workouts),
          title: customTitle,
          type: customWorkoutType,
          description: customDescription || 'Entraînement ajouté depuis le planning.',
          exercises: [],
        }
      : null
    const workoutId = customWorkout?.id ?? (newWorkoutId || workouts[0]?.id)

    if (workoutSource === 'custom' && !customTitle) {
      showAddMsg('Donne un nom à ton entraînement custom.', 'error')
      return
    }
    if (!workoutId) {
      showAddMsg('Choisis un entraînement du catalogue ou crée un entraînement custom.', 'error')
      return
    }
    if (!newDate) {
      showAddMsg('Choisis une date de départ.', 'error')
      return
    }
    const label = newLabel.trim()
    if (!label) {
      showAddMsg('Ajoute un label, par exemple Matin ou Après-midi.', 'error')
      return
    }

    const totalOccurrences = frequencyMode === 'unique' ? 1 : Math.max(1, Math.floor(occurrences))
    const intervalDays = Math.max(1, Math.floor(everyDays))
    const startDate = parseLocalDate(newDate)
    const createdAt = Date.now()
    const generatedEntries: DatedPlanEntry[] = Array.from({ length: totalOccurrences }, (_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + (index * intervalDays))
      return {
        id: `manual-${createdAt}-${index + 1}`,
        date: toLocalDateString(date),
        label: totalOccurrences === 1 ? label : `${label} #${index + 1}`,
        workoutId,
      }
    })

    const existingEntries = settings.plan?.type === 'dated' ? settings.plan.entries : []
    const updatedWorkouts = customWorkout ? [...workouts, customWorkout] : workouts
    const updated: UserSettings = {
      ...settings,
      plan: {
        type: 'dated',
        entries: [...existingEntries, ...generatedEntries]
          .sort((a, b) => a.date.localeCompare(b.date) || planEntryId(a).localeCompare(planEntryId(b))),
      },
      workouts: updatedWorkouts,
      trainingConfigUpdatedAt: new Date().toISOString(),
    }

    await onUpdateSettings(updated)
    setTab('all')
    setShowAddEntry(false)
    if (customWorkout) {
      setNewWorkoutId(customWorkout.id)
      setWorkoutSource('catalog')
      setCustomWorkoutTitle('')
      setCustomWorkoutDescription('')
    }
    showAddMsg(`${generatedEntries.length} entraînement${generatedEntries.length > 1 ? 's' : ''} ajouté${generatedEntries.length > 1 ? 's' : ''} au planning.`)
  }

  return (
    <PageLayout title="Planning">
      <div className="card mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-200">Ajouter un entraînement</h2>
            <p className="text-xs text-gray-500 mt-1">
              Planifie une séance unique ou récurrente à partir du catalogue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddEntry(!showAddEntry)}
            className="btn-secondary px-3 py-1 text-sm"
          >
            {showAddEntry ? 'Fermer' : '+ Ajouter'}
          </button>
        </div>

        {addMessage && (
          <div className={`rounded-xl p-3 text-sm ${
            addMessage.type === 'success'
              ? 'bg-green-900/40 border border-green-700 text-green-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}>
            {addMessage.text}
          </div>
        )}

        {showAddEntry && (
          <form onSubmit={handleAddPlanEntries} className="space-y-3">
            <SegmentedControl
              value={workoutSource}
              onChange={setWorkoutSource}
              options={[
                { value: 'catalog', label: 'Catalogue' },
                { value: 'custom', label: 'Custom' },
              ]}
            />

            {workoutSource === 'catalog' ? (
              <div>
                <label className="label">Entraînement</label>
                <select
                  value={newWorkoutId || workouts[0]?.id || ''}
                  onChange={event => setNewWorkoutId(event.target.value)}
                  className="input-field"
                >
                  {workouts.map(workout => (
                    <option key={workout.id} value={workout.id}>
                      {workout.title} · {workout.type}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-gray-700/70 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="label">Nom</label>
                    <input
                      value={customWorkoutTitle}
                      onChange={event => setCustomWorkoutTitle(event.target.value)}
                      className="input-field"
                      placeholder="Footing facile"
                    />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select
                      value={customWorkoutType}
                      onChange={event => setCustomWorkoutType(event.target.value as WorkoutType)}
                      className="input-field"
                    >
                      <option value="running">Course</option>
                      <option value="strength">Muscu</option>
                      <option value="rest">Repos</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={customWorkoutDescription}
                    onChange={event => setCustomWorkoutDescription(event.target.value)}
                    className="input-field min-h-[72px]"
                    placeholder="Objectif, intensité, consignes..."
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="label">Date de départ</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={event => setNewDate(event.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Label</label>
                <input
                  value={newLabel}
                  onChange={event => setNewLabel(event.target.value)}
                  className="input-field"
                  placeholder="Matin"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFrequencyMode(frequencyMode === 'unique' ? 'recurring' : 'unique')}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                frequencyMode === 'recurring'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {frequencyMode === 'recurring' ? 'RÉPÉTITION' : 'UNIQUE'}
            </button>

            {frequencyMode === 'recurring' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="label">Intervalle en jours</label>
                  <input
                    type="number"
                    min={1}
                    value={everyDays}
                    onChange={event => setEveryDays(Number(event.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Occurrences</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={occurrences}
                    onChange={event => setOccurrences(Number(event.target.value))}
                    className="input-field"
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              Ajouter au planning
            </button>
          </form>
        )}
      </div>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: 'week', label: 'Semaine' },
          { value: 'all', label: 'Tout le programme' },
        ]}
      />

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
        <EmptyState
          icon="📅"
          title="Aucun entraînement planifié"
          description="Importe ou applique une configuration avec un plan daté pour remplir cet écran."
          actionLabel="Configurer les entraînements"
          actionTo="/settings"
        />
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const entryId = planEntryId(entry)
            const workout = workouts.find(w => w.id === entry.workoutId)
            const isToday = entry.date === todayStr
            const existingSession = getSessionForEntry(entry)
            const status = existingSession?.status
            const goalHeadline = formatGoalHeadline(entry.goals)

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
                      <div className="min-w-0">
                        <WorkoutBadge
                          type={workout.type}
                          title={workout.title}
                          description={workout.description}
                        />
                        {goalHeadline && (
                          <div className="text-xs text-gray-500 mt-1 truncate">{goalHeadline}</div>
                        )}
                      </div>
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

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'entrainement'
}

function uniqueWorkoutId(baseId: string, workouts: Workout[]): string {
  const existingIds = new Set(workouts.map(workout => workout.id))
  if (!existingIds.has(baseId)) return baseId

  let index = 2
  while (existingIds.has(`${baseId}_${index}`)) index += 1
  return `${baseId}_${index}`
}
