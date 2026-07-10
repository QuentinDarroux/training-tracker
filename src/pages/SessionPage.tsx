import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageLayout from '../components/PageLayout'
import EmptyState from '../components/EmptyState'
import RatingInput from '../components/RatingInput'
import type {
  WorkoutSession,
  StrengthPerformance,
  RunningPerformance,
  StrengthSet,
  Workout,
} from '../types'
import { calcPace, secondsToHMS, hmsToSeconds, formatPace, parseLocalDate } from '../utils/calc'
import { formatGoalDetails } from '../utils/goals'

interface Props {
  sessions: WorkoutSession[]
  strengthPerfs: StrengthPerformance[]
  runningPerfs: RunningPerformance[]
  workouts: Workout[]
  onSaveSession: (s: WorkoutSession) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
  onSaveStrengthPerf: (p: StrengthPerformance) => Promise<void>
  onSaveRunningPerf: (p: RunningPerformance) => Promise<void>
  onDeleteStrengthPerf: (id: string) => Promise<void>
  onDeleteRunningPerf: (id: string) => Promise<void>
}

export default function SessionPage({
  sessions,
  strengthPerfs,
  runningPerfs,
  workouts,
  onSaveSession,
  onDeleteSession,
  onSaveStrengthPerf,
  onSaveRunningPerf,
  onDeleteStrengthPerf,
  onDeleteRunningPerf,
}: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const session = sessions.find(s => s.id === id)
  const workout = session ? workouts.find(w => w.id === session.workoutId) : undefined

  const [ressenti, setRessenti] = useState(session?.ressenti ?? 6)
  const [fatigue, setFatigue] = useState(session?.fatigue ?? 5)
  const [tflPain, setTflPain] = useState(session?.tflPain ?? 0)
  const [duration, setDuration] = useState(session?.duration?.toString() ?? '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [status, setStatus] = useState(session?.status ?? 'planned')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Running performance state
  const existingRun = runningPerfs.find(p => p.sessionId === id)
  const [distance, setDistance] = useState(existingRun?.distanceKm?.toString() ?? '')
  const [runDuration, setRunDuration] = useState(
    existingRun?.durationSeconds ? secondsToHMS(existingRun.durationSeconds) : ''
  )
  const [fcMoy, setFcMoy] = useState(existingRun?.fcMoyenne?.toString() ?? '')
  const [fcMax, setFcMax] = useState(existingRun?.fcMax?.toString() ?? '')
  const [temp, setTemp] = useState(existingRun?.temperature?.toString() ?? '')
  const [terrain, setTerrain] = useState<string>(existingRun?.terrain ?? '')
  const [runComment, setRunComment] = useState(existingRun?.comment ?? '')

  // Strength sets state (per exercise)
  const [strengthSets, setStrengthSets] = useState<Record<string, StrengthSet[]>>(() => {
    if (!workout || workout.type !== 'strength') return {}
    const result: Record<string, StrengthSet[]> = {}
    for (const ex of workout.exercises) {
      const existingPerf = strengthPerfs.find(p => p.sessionId === id && p.exerciseId === ex.id)
      if (existingPerf) {
        result[ex.id] = existingPerf.sets
      } else {
        result[ex.id] = [{
          plannedSets: ex.sets,
          actualSets: ex.sets,
          plannedReps: ex.reps,
          actualReps: ex.reps,
          weight: 0,
          duration: ex.unit !== 'reps' ? ex.reps : undefined,
        }]
      }
    }
    return result
  })

  useEffect(() => {
    if (session) {
      setRessenti(session.ressenti ?? 6)
      setFatigue(session.fatigue ?? 5)
      setTflPain(session.tflPain ?? 0)
      setDuration(session.duration?.toString() ?? '')
      setNotes(session.notes ?? '')
      setStatus(session.status)
    }
  }, [session])

  if (!session || !workout) {
    return (
      <PageLayout title="Séance">
        <EmptyState
          icon="🔎"
          title="Séance introuvable"
          description="Cette séance n’existe plus localement ou ne correspond plus au programme actif."
          actionLabel="Retour au planning"
          actionTo="/planning"
        />
      </PageLayout>
    )
  }

  const handleSave = async (newStatus?: 'planned' | 'done' | 'skipped') => {
    setSaving(true)
    const finalStatus = newStatus ?? status
    const updatedSession: WorkoutSession = {
      ...session,
      status: finalStatus,
      ressenti: finalStatus !== 'planned' ? ressenti : undefined,
      fatigue: finalStatus !== 'planned' ? fatigue : undefined,
      tflPain: finalStatus !== 'planned' ? tflPain : undefined,
      duration: duration ? Number(duration) : undefined,
      notes: notes || undefined,
      updatedAt: new Date().toISOString(),
    }
    await onSaveSession(updatedSession)
    setStatus(finalStatus)

    if (finalStatus !== 'done') {
      const existingStrength = strengthPerfs.filter(p => p.sessionId === id)
      const existingRunning = runningPerfs.filter(p => p.sessionId === id)
      await Promise.all([
        ...existingStrength.map(p => onDeleteStrengthPerf(p.id)),
        ...existingRunning.map(p => onDeleteRunningPerf(p.id)),
      ])
    }

    if (workout.type === 'running' && finalStatus === 'done') {
      const durationSecs = runDuration ? hmsToSeconds(runDuration) : undefined
      const distKm = distance ? parseFloat(distance) : undefined
      const avgPace = distKm && durationSecs ? calcPace(distKm, durationSecs) : undefined
      const perf: RunningPerformance = {
        id: existingRun?.id ?? `run-${id}-${Date.now()}`,
        sessionId: id!,
        date: session.date,
        workoutId: session.workoutId,
        workoutTitle: session.workoutTitle,
        distanceKm: distKm,
        durationSeconds: durationSecs,
        avgPaceSecondsPerKm: avgPace,
        fcMoyenne: fcMoy ? Number(fcMoy) : undefined,
        fcMax: fcMax ? Number(fcMax) : undefined,
        temperature: temp ? Number(temp) : undefined,
        rpe: ressenti,
        tflPain,
        comment: runComment || undefined,
        terrain: terrain as RunningPerformance['terrain'] || undefined,
        createdAt: existingRun?.createdAt ?? new Date().toISOString(),
      }
      await onSaveRunningPerf(perf)
    }

    if (workout.type === 'strength' && finalStatus === 'done') {
      for (const ex of workout.exercises) {
        const sets = strengthSets[ex.id]
        if (!sets) continue
        const existingPerf = strengthPerfs.find(p => p.sessionId === id && p.exerciseId === ex.id)
        const perf: StrengthPerformance = {
          id: existingPerf?.id ?? `sp-${id}-${ex.id}-${Date.now()}`,
          sessionId: id!,
          date: session.date,
          workoutId: session.workoutId,
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets,
          tflPain,
          createdAt: existingPerf?.createdAt ?? new Date().toISOString(),
        }
        await onSaveStrengthPerf(perf)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette séance ?')) return
    await Promise.all([
      ...strengthPerfs.filter(p => p.sessionId === session.id).map(p => onDeleteStrengthPerf(p.id)),
      ...runningPerfs.filter(p => p.sessionId === session.id).map(p => onDeleteRunningPerf(p.id)),
    ])
    await onDeleteSession(session.id)
    navigate(-1)
  }

  const updateSet = (exerciseId: string, field: keyof StrengthSet, value: number | string) => {
    setStrengthSets(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map((s, i) =>
        i === 0 ? { ...s, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } : s
      ),
    }))
  }

  const avgPaceDisplay = distance && runDuration
    ? formatPace(calcPace(parseFloat(distance), hmsToSeconds(runDuration)))
    : '--'

  const goalLines = formatGoalDetails(session.planGoals)
  const targetDistance = session.planGoals?.travail?.type === 'distance'
    ? session.planGoals.travail.target?.value
    : undefined
  const targetDistancePlaceholder = targetDistance !== undefined ? String(targetDistance) : '12.5'

  return (
    <PageLayout title={workout.title}>
      <div className="space-y-4">
        {/* Header info */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">
                {parseLocalDate(session.date).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{workout.description}</div>
            </div>
            <span className={
              status === 'done' ? 'badge-done' :
              status === 'skipped' ? 'badge-skipped' : 'badge-planned'
            }>
              {status === 'done' ? '✓ Fait' : status === 'skipped' ? 'Passé' : 'Prévu'}
            </span>
          </div>
        </div>

        {/* Goals from the plan entry (objective, RPE, intensity/work targets) */}
        {goalLines.length > 0 && (
          <div className="card space-y-1">
            <h3 className="font-medium text-gray-300 mb-1">🎯 Objectif du jour</h3>
            {goalLines.map((line, i) => (
              <p key={i} className="text-sm text-gray-300">{line}</p>
            ))}
          </div>
        )}

        {/* Running performance */}
        {workout.type === 'running' && (
          <div className="card space-y-3">
            <h3 className="font-medium text-gray-300">Performance course</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Distance (km)</label>
                <input type="number" step="0.01" value={distance}
                  onChange={e => setDistance(e.target.value)}
                  className="input-field" placeholder={targetDistancePlaceholder} />
              </div>
              <div>
                <label className="label">Durée (mm:ss ou hh:mm:ss)</label>
                <input type="text" value={runDuration}
                  onChange={e => setRunDuration(e.target.value)}
                  className="input-field" placeholder="55:30" />
              </div>
            </div>
            {distance && runDuration && (
              <div className="text-sm text-blue-400">⚡ Allure : {avgPaceDisplay}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">FC moyenne (bpm)</label>
                <input type="number" value={fcMoy}
                  onChange={e => setFcMoy(e.target.value)}
                  className="input-field" placeholder="145" />
              </div>
              <div>
                <label className="label">FC max (bpm)</label>
                <input type="number" value={fcMax}
                  onChange={e => setFcMax(e.target.value)}
                  className="input-field" placeholder="168" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Température (°C)</label>
                <input type="number" value={temp}
                  onChange={e => setTemp(e.target.value)}
                  className="input-field" placeholder="18" />
              </div>
              <div>
                <label className="label">Terrain</label>
                <select value={terrain} onChange={e => setTerrain(e.target.value)}
                  className="input-field">
                  <option value="">—</option>
                  <option value="plat">Plat</option>
                  <option value="vallonné">Vallonné</option>
                  <option value="trail">Trail</option>
                  <option value="tapis">Tapis</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Commentaire</label>
              <textarea value={runComment} onChange={e => setRunComment(e.target.value)}
                className="input-field" rows={2} />
            </div>
          </div>
        )}

        {/* Strength exercises */}
        {workout.type === 'strength' && workout.exercises.map(ex => {
          const sets = strengthSets[ex.id]?.[0]
          if (!sets) return null
          return (
            <div key={ex.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-200">{ex.name}</h4>
                <span className="text-xs text-gray-500">
                  Prévu: {ex.sets}×{ex.reps}{ex.unit === 'seconds' ? 's' : ex.unit === 'minutes' ? 'min' : ''}
                  {ex.side === 'unilateral' ? '/jambe' : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">Séries réalisées</label>
                  <input type="number" value={sets.actualSets}
                    onChange={e => updateSet(ex.id, 'actualSets', e.target.value)}
                    className="input-field text-center" min={0} />
                </div>
                <div>
                  <label className="label text-xs">
                    {ex.unit === 'seconds' ? 'Durée (s)' : ex.unit === 'minutes' ? 'Durée (min)' : 'Reps'}
                  </label>
                  <input type="number"
                    value={ex.unit !== 'reps' ? (sets.duration ?? ex.reps) : sets.actualReps}
                    onChange={e => updateSet(ex.id, ex.unit !== 'reps' ? 'duration' : 'actualReps', e.target.value)}
                    className="input-field text-center" min={0} />
                </div>
                {ex.trackWeight && (
                  <div>
                    <label className="label text-xs">Charge (kg)</label>
                    <input type="number" step="0.5" value={sets.weight ?? 0}
                      onChange={e => updateSet(ex.id, 'weight', e.target.value)}
                      className="input-field text-center" min={0} />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* General session fields */}
        <div className="card space-y-4">
          <h3 className="font-medium text-gray-300">Bilan de séance</h3>
          <div>
            <label className="label">Durée totale (min)</label>
            <input type="number" value={duration}
              onChange={e => setDuration(e.target.value)}
              className="input-field" placeholder={session.planGoals?.estimatedDurationMin ? String(session.planGoals.estimatedDurationMin) : '60'} />
          </div>
          <RatingInput label="Ressenti" value={ressenti} min={1} max={10}
            onChange={setRessenti} />
          <RatingInput label="Fatigue" value={fatigue} min={1} max={10}
            onChange={setFatigue} />
          <RatingInput label="Douleur TFL" value={tflPain} min={0} max={10}
            onChange={setTflPain} />
          <div>
            <label className="label">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="input-field" rows={3} placeholder="Notes libres..." />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {saved && (
            <div className="bg-green-900/40 border border-green-700 rounded-lg p-2 text-center text-sm text-green-300">
              ✓ Sauvegardé
            </div>
          )}
          <button
            onClick={() => handleSave('done')}
            disabled={saving}
            className="btn-primary w-full py-3 text-base"
          >
            {saving ? '...' : '✓ Marquer comme faite'}
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="btn-secondary w-full"
          >
            💾 Sauvegarder (partiel)
          </button>
          <button
            onClick={() => handleSave('skipped')}
            disabled={saving}
            className="btn-secondary w-full"
          >
            ⏭ Passer
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger w-full"
          >
            🗑 Supprimer la séance
          </button>
        </div>
      </div>
    </PageLayout>
  )
}
