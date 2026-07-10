import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import PageLayout from '../components/PageLayout'
import EmptyState from '../components/EmptyState'
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
import { getAllPlanEntries, getPlanEntriesForCurrentWeek, planEntryId } from '../services/trainingConfigService'
import { formatGoalHeadline } from '../utils/goals'

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

  const raceDate = settings?.metadata?.raceDate
  const daysToRace = raceDate ? Math.ceil(
    (parseLocalDate(raceDate).getTime() - parseLocalDate(todayStr).getTime()) / (1000 * 60 * 60 * 24)
  ) : undefined

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
  const tooltipStyle = {
    background: 'var(--glass-card-strong)',
    border: '1px solid var(--app-border)',
    borderRadius: 12,
    color: 'var(--app-text)',
    boxShadow: 'var(--glass-shadow)',
  }

  return (
    <PageLayout title="Training Tracker">
      {(settings?.metadata?.name || daysToRace !== undefined) && (
        <div className="card mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {settings?.metadata?.name && (
              <div className="text-sm font-medium text-gray-200 truncate">{settings.metadata.name}</div>
            )}
            {settings?.metadata?.targetTime && (
              <div className="text-xs text-gray-500 mt-0.5">
                Objectif : {settings.metadata.targetTime}{settings.metadata.targetPace ? ` · ${settings.metadata.targetPace}` : ''}
              </div>
            )}
          </div>
          {daysToRace !== undefined && (
            <div className="text-center shrink-0">
              <div className="text-xl font-bold text-indigo-400">{daysToRace > 0 ? `J-${daysToRace}` : '🏁'}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Course</div>
            </div>
          )}
        </div>
      )}
      {nextPlanEntry && nextWorkout ? (
        <div className="card mb-4 border-indigo-700">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Prochaine séance</div>
              <h2 className="mt-2 text-2xl font-bold text-gray-100">{nextWorkout.title}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {formatDate(nextPlanEntry.date)} · {nextPlanEntry.label}
              </p>
              {formatGoalHeadline(nextPlanEntry.goals) && (
                <p className="mt-1 text-xs text-indigo-300">{formatGoalHeadline(nextPlanEntry.goals)}</p>
              )}
              <p className="mt-3 line-clamp-2 text-sm text-gray-500">{nextWorkout.description}</p>
            </div>
            <div className="rounded-2xl bg-indigo-500/15 px-3 py-2 text-3xl">
              {nextWorkout.type === 'strength' ? '💪' : '🏃'}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/aujourd-hui" className="btn-primary">
              Voir aujourd’hui
            </Link>
            <Link to="/planning" className="btn-secondary">
              Planning
            </Link>
          </div>
        </div>
      ) : allPlanEntries.length === 0 ? (
        <div className="mb-4">
          <EmptyState
            icon="🧭"
            title="Aucun programme actif"
            description="Importe une config ou ouvre le planning pour commencer à organiser tes séances."
            actionLabel="Ouvrir le planning"
            actionTo="/planning"
          />
        </div>
      ) : (
        <div className="card mb-4 text-center space-y-3">
          <div className="text-4xl">🏁</div>
          <div>
            <p className="font-semibold text-gray-200">Programme terminé</p>
            <p className="text-sm text-gray-500">Toutes les séances actionnables sont faites ou passées.</p>
          </div>
          <Link to="/planning" className="btn-secondary w-full">Voir le programme</Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard value={`${weekDone}/${actionableWeekEntries.length}`} label="Semaine" color="text-indigo-400" />
        <StatCard value={`${weekAdherence}%`} label="Assiduité" color="text-green-400" />
        <StatCard value={`${programProgress}%`} label="Programme" color="text-purple-400" />
        <StatCard value={weeklyVolume.toFixed(1)} label="km semaine" color="text-blue-400" />
        <StatCard value={String(weekSkipped)} label="Passées" color="text-yellow-400" />
        <StatCard value={totalDistance.toFixed(1)} label="km total" color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
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
              <Tooltip contentStyle={tooltipStyle} />
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
              <Tooltip contentStyle={tooltipStyle} />
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
              <Tooltip contentStyle={tooltipStyle} />
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
              <Tooltip contentStyle={tooltipStyle} />
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
              <Tooltip contentStyle={tooltipStyle} />
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
                contentStyle={tooltipStyle}
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
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="hr" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
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
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}
