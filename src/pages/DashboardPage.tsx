import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import PageLayout from '../components/PageLayout'
import type { WorkoutSession, RunningPerformance } from '../types'
import { isThisWeek, today, formatDate, formatPace } from '../utils/calc'

interface Props {
  sessions: WorkoutSession[]
  runningPerfs: RunningPerformance[]
}

export default function DashboardPage({ sessions, runningPerfs }: Props) {
  const todayStr = today()

  const thisWeekSessions = useMemo(
    () => sessions.filter(s => isThisWeek(s.date)),
    [sessions]
  )
  
  const doneSessions = thisWeekSessions.filter(s => s.status === 'done').length
  const plannedSessions = thisWeekSessions.length
  const adherence = plannedSessions > 0 ? Math.round((doneSessions / plannedSessions) * 100) : 0

  const thisWeekRunning = useMemo(
    () => runningPerfs.filter(p => isThisWeek(p.date)),
    [runningPerfs]
  )
  const weeklyVolume = thisWeekRunning.reduce((sum, p) => sum + (p.distanceKm ?? 0), 0)

  const strengthDoneThisWeek = thisWeekSessions.filter(
    s => s.status === 'done' && s.workoutType === 'strength'
  ).length

  const lastSession = sessions.find(s => s.status === 'done')
  const nextSession = sessions.find(s => s.status === 'planned' && s.date >= todayStr)

  // TFL trend data (last 8 sessions with TFL data)
  const tflData = sessions
    .filter(s => s.tflPain !== undefined)
    .slice(0, 12)
    .reverse()
    .map(s => ({ date: s.date.slice(5), tfl: s.tflPain }))

  // Pace trend (last 8 running perfs)
  const paceData = runningPerfs
    .filter(p => p.avgPaceSecondsPerKm)
    .slice(0, 8)
    .reverse()
    .map(p => ({
      date: p.date.slice(5),
      pace: p.avgPaceSecondsPerKm ? Math.round(p.avgPaceSecondsPerKm / 60 * 100) / 100 : null,
    }))

  // HR trend
  const hrData = runningPerfs
    .filter(p => p.fcMoyenne)
    .slice(0, 8)
    .reverse()
    .map(p => ({ date: p.date.slice(5), hr: p.fcMoyenne }))

  // Weekly volume (last 6 weeks)
  const weeklyVolumeData = useMemo(() => {
    const weeks: Record<string, number> = {}
    for (const p of runningPerfs) {
      const d = new Date(p.date)
      const mon = new Date(d)
      const day = d.getDay()
      mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      const key = mon.toISOString().split('T')[0].slice(5)
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-indigo-400">{doneSessions}/{plannedSessions}</div>
          <div className="text-xs text-gray-400 mt-1">Séances cette semaine</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-400">{adherence}%</div>
          <div className="text-xs text-gray-400 mt-1">Assiduité</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-400">{weeklyVolume.toFixed(1)}</div>
          <div className="text-xs text-gray-400 mt-1">km cette semaine</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-orange-400">{strengthDoneThisWeek}</div>
          <div className="text-xs text-gray-400 mt-1">Séances muscu</div>
        </div>
      </div>

      {/* Last / Next session */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        {lastSession && (
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">Dernière séance</div>
            <div className="font-medium">{lastSession.workoutTitle}</div>
            <div className="text-sm text-gray-400">{formatDate(lastSession.date)}</div>
            {lastSession.ressenti !== undefined && (
              <div className="text-xs text-gray-500 mt-1">Ressenti: {lastSession.ressenti}/10</div>
            )}
          </div>
        )}
        {nextSession && (
          <div className="card border-indigo-700">
            <div className="text-xs text-gray-500 mb-1">Prochaine séance</div>
            <div className="font-medium text-indigo-300">{nextSession.workoutTitle}</div>
            <div className="text-sm text-gray-400">{formatDate(nextSession.date)}</div>
          </div>
        )}
      </div>

      {/* Weekly Volume Chart */}
      {weeklyVolumeData.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Volume hebdo (km)</h3>
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

      {/* TFL Pain Chart */}
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

      {/* Pace Chart */}
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

      {/* HR Chart */}
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

      {sessions.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-4xl mb-2">👋</p>
          <p>Commence par aller dans <strong>Planning</strong> pour voir ta semaine.</p>
        </div>
      )}

      {/* Quick links to other pages */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link to="/exercices" className="card flex items-center gap-2 hover:border-indigo-600 transition-colors">
          <span className="text-xl">💪</span>
          <span className="text-sm text-gray-300">Exercices</span>
        </Link>
        <Link to="/objectifs" className="card flex items-center gap-2 hover:border-indigo-600 transition-colors">
          <span className="text-xl">🎯</span>
          <span className="text-sm text-gray-300">Objectifs</span>
        </Link>
      </div>
    </PageLayout>
  )
}
