import { useState, useEffect, useCallback } from 'react'
import type {
  WorkoutSession,
  StrengthPerformance,
  RunningPerformance,
  UserSettings,
  UserGoal,
} from '../types'
import {
  getAllSessions,
  getAllStrengthPerfs,
  getAllRunningPerfs,
  getSettings,
  getGoals,
  saveSession as saveSess,
  saveStrengthPerf as saveStrPerf,
  saveRunningPerf as saveRunPerf,
  saveSettings as saveSetts,
  saveGoals as saveGoal,
  deleteSession as delSession,
  deleteStrengthPerf as delStrPerf,
  deleteRunningPerf as delRunPerf,
} from '../services/storageService'
import { applyTrainingConfig, fetchDeployedTrainingConfig } from '../services/trainingConfigService'

export function useData() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [strengthPerfs, setStrengthPerfs] = useState<StrengthPerformance[]>([])
  const [runningPerfs, setRunningPerfs] = useState<RunningPerformance[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [goals, setGoals] = useState<UserGoal | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [sess, sp, rp, storedSettings, g] = await Promise.all([
      getAllSessions(),
      getAllStrengthPerfs(),
      getAllRunningPerfs(),
      getSettings(),
      getGoals(),
    ])
    let setts = storedSettings
    try {
      const deployedConfig = await fetchDeployedTrainingConfig()
      if (deployedConfig) {
        setts = applyTrainingConfig(storedSettings, deployedConfig)
        if (JSON.stringify(setts) !== JSON.stringify(storedSettings)) {
          await saveSetts(setts)
        }
      }
    } catch (error) {
      console.warn(error)
    }
    setSessions(sess.sort((a, b) => b.date.localeCompare(a.date)))
    setStrengthPerfs(sp.sort((a, b) => b.date.localeCompare(a.date)))
    setRunningPerfs(rp.sort((a, b) => b.date.localeCompare(a.date)))
    setSettings(setts)
    setGoals(g)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const saveSession = async (s: WorkoutSession) => {
    await saveSess(s)
    await loadAll()
  }

  const deleteSession = async (id: string) => {
    await delSession(id)
    await loadAll()
  }

  const saveStrengthPerf = async (p: StrengthPerformance) => {
    await saveStrPerf(p)
    await loadAll()
  }

  const deleteStrengthPerf = async (id: string) => {
    await delStrPerf(id)
    await loadAll()
  }

  const saveRunningPerf = async (p: RunningPerformance) => {
    await saveRunPerf(p)
    await loadAll()
  }

  const deleteRunningPerf = async (id: string) => {
    await delRunPerf(id)
    await loadAll()
  }

  const updateSettings = async (s: UserSettings) => {
    await saveSetts(s)
    setSettings(s)
  }

  const updateGoals = async (g: UserGoal) => {
    await saveGoal(g)
    setGoals(g)
  }

  return {
    sessions, strengthPerfs, runningPerfs, settings, goals, loading,
    saveSession, deleteSession,
    saveStrengthPerf, deleteStrengthPerf,
    saveRunningPerf, deleteRunningPerf,
    updateSettings, updateGoals,
    reload: loadAll,
  }
}
