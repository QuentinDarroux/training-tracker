import { HashRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import DashboardPage from './pages/DashboardPage'
import PlanningPage from './pages/PlanningPage'
import TodayPage from './pages/TodayPage'
import SessionPage from './pages/SessionPage'
import HistoriquePage from './pages/HistoriquePage'
import ExercicesPage from './pages/ExercicesPage'
import ObjectifsPage from './pages/ObjectifsPage'
import SettingsPage from './pages/SettingsPage'
import { useData } from './hooks/useData'
import { getStrengthSuggestions, getRunningSuggestions } from './services/progressService'
import { useMemo } from 'react'

export default function App() {
  const {
    sessions, strengthPerfs, runningPerfs, settings, goals, loading,
    saveSession, deleteSession,
    saveStrengthPerf, deleteStrengthPerf,
    saveRunningPerf, deleteRunningPerf,
    updateSettings, updateGoals,
    reload,
  } = useData()

  const suggestions = useMemo(() => [
    ...getStrengthSuggestions(strengthPerfs, sessions),
    ...getRunningSuggestions(runningPerfs, sessions),
  ], [strengthPerfs, runningPerfs, sessions])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <DashboardPage sessions={sessions} runningPerfs={runningPerfs} />
        } />
        <Route path="/planning" element={
          <PlanningPage
            sessions={sessions}
            settings={settings}
            onCreateSession={saveSession}
          />
        } />
        <Route path="/aujourd-hui" element={
          <TodayPage
            sessions={sessions}
            settings={settings}
            onCreateSession={saveSession}
          />
        } />
        <Route path="/seance/:id" element={
          <SessionPage
            sessions={sessions}
            strengthPerfs={strengthPerfs}
            runningPerfs={runningPerfs}
            onSaveSession={saveSession}
            onDeleteSession={deleteSession}
            onSaveStrengthPerf={saveStrengthPerf}
            onSaveRunningPerf={saveRunningPerf}
            onDeleteStrengthPerf={deleteStrengthPerf}
            onDeleteRunningPerf={deleteRunningPerf}
          />
        } />
        <Route path="/historique" element={
          <HistoriquePage
            sessions={sessions}
            runningPerfs={runningPerfs}
            strengthPerfs={strengthPerfs}
            onDeleteSession={deleteSession}
          />
        } />
        <Route path="/exercices" element={
          <ExercicesPage
            strengthPerfs={strengthPerfs}
            sessions={sessions}
            suggestions={suggestions}
          />
        } />
        <Route path="/objectifs" element={
          <ObjectifsPage
            goals={goals}
            sessions={sessions}
            runningPerfs={runningPerfs}
            onSaveGoals={updateGoals}
          />
        } />
        <Route path="/settings" element={
          <SettingsPage
            settings={settings}
            onReload={reload}
            onUpdateSettings={updateSettings}
          />
        } />
      </Routes>
      <BottomNav />
    </HashRouter>
  )
}
