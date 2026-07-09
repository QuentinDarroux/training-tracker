import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import type { UserGoal, RunningPerformance, WorkoutSession } from '../types'
import { hmsToSeconds, isThisWeek, secondsToHMS } from '../utils/calc'

interface Props {
  goals: UserGoal | null
  sessions: WorkoutSession[]
  runningPerfs: RunningPerformance[]
  onSaveGoals: (g: UserGoal) => Promise<void>
}

export default function ObjectifsPage({ goals, sessions, runningPerfs, onSaveGoals }: Props) {
  const [editing, setEditing] = useState(false)
  const [goal10k, setGoal10k] = useState(goals?.goal10kSeconds ? secondsToHMS(goals.goal10kSeconds) : '50:00')
  const [goalHalf, setGoalHalf] = useState(goals?.goalHalfMarathonSeconds ? secondsToHMS(goals.goalHalfMarathonSeconds) : '1:55:00')
  const [fcMax, setFcMax] = useState(goals?.fcMax?.toString() ?? '195')
  const [efLow, setEfLow] = useState(goals?.efZoneLow?.toString() ?? '135')
  const [efHigh, setEfHigh] = useState(goals?.efZoneHigh?.toString() ?? '155')
  const [weight, setWeight] = useState(goals?.weightKg?.toString() ?? '')
  const [weekVol, setWeekVol] = useState(goals?.weeklyVolumeKm?.toString() ?? '30')
  const [weekSessions, setWeekSessions] = useState(goals?.weeklySessionCount?.toString() ?? '5')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSaveGoals({
      goal10kSeconds: hmsToSeconds(goal10k) || undefined,
      goalHalfMarathonSeconds: hmsToSeconds(goalHalf) || undefined,
      fcMax: fcMax ? Number(fcMax) : undefined,
      efZoneLow: efLow ? Number(efLow) : undefined,
      efZoneHigh: efHigh ? Number(efHigh) : undefined,
      weightKg: weight ? Number(weight) : undefined,
      weeklyVolumeKm: weekVol ? Number(weekVol) : undefined,
      weeklySessionCount: weekSessions ? Number(weekSessions) : undefined,
    })
    setSaving(false)
    setEditing(false)
  }

  // Compute progress
  const doneSessions = sessions.filter(s => s.status === 'done').length
  const totalSessions = sessions.length
  const adherence = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0
  
  const thisWeekRun = runningPerfs
    .filter(p => isThisWeek(p.date))
    .reduce((sum, p) => sum + (p.distanceKm ?? 0), 0)

  const bestPace = runningPerfs
    .filter(p => p.workoutId === 'footing_ef' && p.avgPaceSecondsPerKm)
    .sort((a, b) => (a.avgPaceSecondsPerKm ?? 999) - (b.avgPaceSecondsPerKm ?? 999))[0]

  return (
    <PageLayout title="Objectifs">
      <div className="space-y-4">
        {!editing ? (
          <>
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-300">Mes objectifs</h3>
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-1">
                  ✏️ Modifier
                </button>
              </div>
              <GoalRow label="Objectif 10km" value={goals?.goal10kSeconds ? secondsToHMS(goals.goal10kSeconds) : '—'} />
              <GoalRow label="Objectif semi" value={goals?.goalHalfMarathonSeconds ? secondsToHMS(goals.goalHalfMarathonSeconds) : '—'} />
              <GoalRow label="FC max" value={goals?.fcMax ? `${goals.fcMax} bpm` : '—'} />
              <GoalRow label="Zone EF" value={goals?.efZoneLow && goals?.efZoneHigh ? `${goals.efZoneLow}–${goals.efZoneHigh} bpm` : '—'} />
              <GoalRow label="Poids" value={goals?.weightKg ? `${goals.weightKg} kg` : '—'} />
              <GoalRow label="Volume hebdo" value={goals?.weeklyVolumeKm ? `${goals.weeklyVolumeKm} km` : '—'} />
              <GoalRow label="Séances/semaine" value={goals?.weeklySessionCount?.toString() ?? '—'} />
            </div>

            {/* Progress */}
            <div className="card space-y-3">
              <h3 className="font-medium text-gray-300">Progression</h3>
              <ProgressBar
                label={`Volume cette semaine (${thisWeekRun.toFixed(1)}/${goals?.weeklyVolumeKm ?? '?'} km)`}
                value={thisWeekRun}
                max={goals?.weeklyVolumeKm ?? 30}
                color="blue"
              />
              <ProgressBar
                label={`Assiduité globale (${adherence}%)`}
                value={adherence}
                max={100}
                color="green"
              />
              {bestPace && (
                <div className="text-sm text-gray-400">
                  Meilleure allure EF: {Math.floor((bestPace.avgPaceSecondsPerKm ?? 0) / 60)}:{String((bestPace.avgPaceSecondsPerKm ?? 0) % 60).padStart(2,'0')}/km
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card space-y-3">
            <h3 className="font-medium text-gray-300">Modifier les objectifs</h3>
            <FormField label="Objectif 10km (mm:ss)" value={goal10k} onChange={setGoal10k} placeholder="50:00" />
            <FormField label="Objectif semi (h:mm:ss)" value={goalHalf} onChange={setGoalHalf} placeholder="1:55:00" />
            <FormField label="FC max (bpm)" value={fcMax} onChange={setFcMax} type="number" placeholder="195" />
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Zone EF bas" value={efLow} onChange={setEfLow} type="number" placeholder="135" />
              <FormField label="Zone EF haut" value={efHigh} onChange={setEfHigh} type="number" placeholder="155" />
            </div>
            <FormField label="Poids (kg)" value={weight} onChange={setWeight} type="number" placeholder="70" />
            <FormField label="Volume hebdo cible (km)" value={weekVol} onChange={setWeekVol} type="number" placeholder="30" />
            <FormField label="Séances/semaine" value={weekSessions} onChange={setWeekSessions} type="number" placeholder="5" />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1" disabled={saving}>
                Annuler
              </button>
              <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                {saving ? '...' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function GoalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  )
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: 'blue' | 'green' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full">
        <div
          className={`h-2 rounded-full ${color === 'blue' ? 'bg-blue-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="input-field" placeholder={placeholder} />
    </div>
  )
}
