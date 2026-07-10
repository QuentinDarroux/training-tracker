import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import PageLayout from '../components/PageLayout'
import type { DatedPlanEntry, RunningPerformance, UserSettings, Workout, WorkoutSession } from '../types'
import {
  getWeekStart,
  isThisWeek,
  today,
  formatDate,
  formatPace,
  parseLocalDate,
  toLocalDateString,
} from '../utils/calc'
import {
  getAllPlanEntries,
  getPlanEntriesForCurrentWeek,
  planEntryId,
} from '../services/trainingConfigService'

interface Props {
  sessions: WorkoutSession[]
  runningPerfs: RunningPerformance[]
  settings: UserSettings | null
  workouts: Workout[]
}

const typeLabels = {
  running: 'Course',
  strength: 'Muscu',
  rest: 'Repos',
}

const typeColors = {
  running: '#60a5fa',
  strength: '#fb923c',
  rest: '#6b7280',
}

export default function DashboardPage({ sessions, runningPerfs, settings, workouts }: Props) {
  const todayStr = today()
  const allPlanEntries = useMemo(() => getAllPlanEntries(settings), [settings])
  const thisWeekEntries = useMemo(() => getPlanEntriesForCurrentWeek(settings), [settings])
  const workoutById = useMemo(
    () => new Map(workouts.map(workout => [workout.id, workout])),
    [workouts]
  )

  const getWorkout = useCallback(
    (workoutId: string): Workout | undefined => workoutById.get(workoutId),
    [workoutById]
  )

  const getSessionForEntry = useCallback(
    (entry: DatedPlanEntry): WorkoutSession | undefined => {
      const entryId = planEntryId(entry)
      return sessions.find(session =>
        session.planEntryId === entryId
        || (!session.planEntryId && session.date === entry.date && session.workoutId === entry.workoutId)
      )
    },
    [sessions]
  )

  const actionableWeekEntries = thisWeekEntries.filter(entry => getWorkout(entry.workoutId)?.type !== 'rest')
  const actionableProgramEntries = allPlanEntries.filter(entry => getWorkout(entry.workoutId)?.type !== 'rest')

  const weekDone = actionableWeekEntries.filter(entry => getSessionForEntry(entry)?.status === 'done').length
  const weekSkipped = actionableWeekEntries.filter(entry => getSessionForEntry(entry)?.status === 'skipped').length
  const weekAdherence = actionableWeekEntries.length > 0
    ? Math.round((weekDone / actionableWeekEntries.length) * 100)
    : 0
  const programDone = actionableProgramEntries.filter(entry => getSessionForEntry(entry)?.status === 'done').length
  const programProgress = actionableProgramEntries.length > 0
    ? Math.round((programDone / actionableProgramEntries.length) * 100)
    : 0

  const thisWeekRunning = useMemo(
    () => runningPerfs.filter(p => isThisWeek(p.date)),
    [runningPerfs]
  )
  const weeklyVolume = thisWeekRunning.reduce((sum, p) => sum + (p.distanceKm ?? 0), 0)
  const totalDistance = runningPerfs.reduce((sum, p) => sum + (p.distanceKm ?? 0), 0)

  const nextPlanEntry = allPlanEntries
    .filter(entry => entry.date >= todayStr)
    .filter(entry => getWorkout(entry.workoutId)?.type !== 'rest')
    .filter(entry => !['done', 'skipped'].includes(getSessionForEntry(entry)?.status ?? ''))
    .sort((a, b) => a.date.localeCompare(b.date) || planEntryId(a).localeCompare(planEntryId(b)))[0]
  const nextWorkout = nextPlanEntry ? getWorkout(nextPlanEntry.workoutId) : undefined

  const lastSession = sessions.find(s => s.status === 'done')

  const programDistributionData = useMemo(() => {
    const counts = { running: 0, strength: 0, rest: 0 }
    for (const entry of allPlanEntries) {
      const workout = getWorkout(entry.workoutId)
      if (workout) counts[workout.type] += 1
    }
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([type, value]) => ({
        type,
        name: typeLabels[type as keyof typeof typeLabels],
        value,
      }))
  }, [allPlanEntries, getWorkout])

  const upcomingLoadData = useMemo(() => {
    const start = parseLocalDate(todayStr)
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const dateStr = toLocalDateString(date)
      const entries = allPlanEntries.filter(entry => entry.date === dateStr)
      return {
        date: dateStr.slice(5),
        running: entries.filter(entry => getWorkout(entry.workoutId)?.type === 'running').length,
        strength: entries.filter(entry => getWorkout(entry.workoutId)?.type === 'strength').length,
        rest: entries.filter(entry => getWorkout(entry.workoutId)?.type === 'rest').length,
      }
    })
  }, [allPlanEntries, todayStr, getWorkout])

  const programProgressData = useMemo(() => {
    let done = 0
    return actionableProgramEntries
      .sort((a, b) => a.date.localeCompare(b.date) || planEntryId(a).localeCompare(planEntryId(b)))
      .map((entry, index) => {
        if (getSessionForEntry(entry)?.status === 'done') done += 1
        return {
          label: `J${index + 1}`,
          done,
          planned: index + 1,
        }
      })
  }, [actionableProgramEntries, getSessionForEntry])

  const tflData = sessions
    .filter(s => s.tflPain !== undefined)
    .slice(0, 12)
    .reverse()
    .map(s => ({ date: s.date.slice(5), tfl: s.tflPain }))

  const paceData = runningPerfs
    .filter(p => p.avgPaceSecondsPerKm)
    .slice(0, 8)
    .reverse()
    .map(p => ({
      date: p.date.slice(5),
      pace: p.avgPaceSecondsPerKm ? Math.round(p.avgPaceSecondsPerKm / 60 * 100) / 100 : null,
    }))

  const hrData = runningPerfs
    .filter(p => p.fcMoyenne)
    .slice(0, 8)
    .reverse()
    .map(p => ({ date: p.date.slice(5), hr: p.fcMoyenne }))

  const weeklyVolumeData = useMemo(() => {
    const weeks: Record<string, number> = {}
    for (const p of runningPerfs) {
      const key = getWeekStart(p.date).slice(5)
      weeks[key] = (weeks[key] ?? 0) + (p.distanceKm ?? 0)
    }
    return Object.entries(weeks)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([week, km]) => ({ week, km: Math.round(km * 10) / 10 }))
  }, [runningPerfs])

  const chartProps = {
    style: { fontSize: 11 },
  }

  return (
    <PageLayout title="Training Tracker">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard value={`${weekDone}/${actionableWeekEntries.length}`} label="Séances semaine" color="text-indigo-400" />
        <StatCard value={`${weekAdherence}%`} label="Assiduité semaine" color="text-green-400" />
        <StatCard value={`${programProgress}%`} label="Programme réalisé" color="text-purple-400" />
        <StatCard value={weeklyVolume.toFixed(1)} label="km cette semaine" color="text-blue-400" />
        <StatCard value={String(weekSkipped)} label="Séances passées" color="text-yellow-400" />
        <StatCard value={totalDistance.toFixed(1)} label="km total" color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        {nextPlanEntry && nextWorkout && (
          <div className="card border-indigo-700">
            <div className="text-xs text-gray-500 mb-1">Prochaine séance du programme</div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-indigo-300">{nextWorkout.title}</div>
                <div className="text-sm text-gray-400">
                  {formatDate(nextPlanEntry.date)} · {nextPlanEntry.label}
                </div>
              </div>
              <span className="text-2xl">{nextWorkout.type === 'strength' ? '💪' : '🏃'}</span>
            </div>
          </div>
        )}
        {lastSession && (
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">Dernière séance réalisée</div>
            <div className="font-medium">{lastSession.workoutTitle}</div>
            <div className="text-sm text-gray-400">
              {formatDate(lastSession.date)}{lastSession.planLabel ? ` · ${lastSession.planLabel}` : ''}
            </div>
            {lastSession.ressenti !== undefined && (
              <div className="text-xs text-gray-500 mt-1">Ressenti: {lastSession.ressenti}/10</div>
            )}
          </div>
        )}
      </div>

      {programDistributionData.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Répartition du programme</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={programDistributionData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {programDistributionData.map(entry => (
                  <Cell key={entry.type} fill={typeColors[entry.type as keyof typeof typeColors]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {upcomingLoadData.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Charge planifiée · 14 prochains jours</h3>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={upcomingLoadData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="running" name="Course" stackId="a" fill={typeColors.running} radius={[4, 4, 0, 0]} />
              <Bar dataKey="strength" name="Muscu" stackId="a" fill={typeColors.strength} radius={[4, 4, 0, 0]} />
              <Bar dataKey="rest" name="Repos" stackId="a" fill={typeColors.rest} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {programProgressData.length > 1 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Progression du programme</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={programProgressData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Line type="monotone" dataKey="planned" name="Prévu" stroke="#818cf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="done" name="Réalisé" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {weeklyVolumeData.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Volume hebdo réalisé (km)</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyVolumeData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="km" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tflData.length > 1 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Douleur TFL (0-10)</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={tflData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Line type="monotone" dataKey="tfl" stroke="#f87171" strokeWidth={2} dot={{ fill: '#f87171', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {paceData.length > 1 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Allure moyenne (min/km)</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={paceData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis reversed tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickFormatter={v => formatPace(Math.round(v * 60))} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v: number) => [formatPace(Math.round(v * 60)), 'Allure']}
              />
              <Line type="monotone" dataKey="pace" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hrData.length > 1 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">FC moyenne (bpm)</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={hrData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Line type="monotone" dataKey="hr" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {sessions.length === 0 && allPlanEntries.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-4xl mb-2">👋</p>
          <p>Commence par aller dans <strong>Planning</strong> pour voir ton programme.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link to="/planning" className="card flex items-center gap-2 hover:border-indigo-600 transition-colors">
          <span className="text-xl">📅</span>
          <span className="text-sm text-gray-300">Planning</span>
        </Link>
        <Link to="/objectifs" className="card flex items-center gap-2 hover:border-indigo-600 transition-colors">
          <span className="text-xl">🎯</span>
          <span className="text-sm text-gray-300">Objectifs</span>
        </Link>
      </div>
    </PageLayout>
  )
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="card text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}
