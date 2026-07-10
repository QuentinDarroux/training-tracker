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
import { getActiveWorkouts } from './services/trainingConfigService'
import { useEffect, useMemo } from 'react'

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
  const workoutCatalog = useMemo(() => getActiveWorkouts(settings), [settings])

  useEffect(() => {
    const root = document.documentElement
    const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const selectedTheme = settings?.theme ?? 'system'
      const isDark = selectedTheme === 'dark' || (selectedTheme === 'system' && prefersDark)

      localStorage.setItem('training-tracker-theme', selectedTheme)
      root.classList.toggle('dark', isDark)
      root.dataset.theme = isDark ? 'dark' : 'light'
      metaThemeColor?.setAttribute('content', isDark ? '#10111f' : '#f4f7fb')
    }

    applyTheme()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [settings?.theme])

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
          <DashboardPage
            sessions={sessions}
            runningPerfs={runningPerfs}
            settings={settings}
            workouts={workoutCatalog}
          />
        } />
        <Route path="/planning" element={
          <PlanningPage
            sessions={sessions}
            settings={settings}
            workouts={workoutCatalog}
            onCreateSession={saveSession}
            onUpdateSettings={updateSettings}
          />
        } />
        <Route path="/aujourd-hui" element={
          <TodayPage
            sessions={sessions}
            settings={settings}
            workouts={workoutCatalog}
            onCreateSession={saveSession}
          />
        } />
        <Route path="/seance/:id" element={
          <SessionPage
            sessions={sessions}
            strengthPerfs={strengthPerfs}
            runningPerfs={runningPerfs}
            workouts={workoutCatalog}
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
            workouts={workoutCatalog}
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
