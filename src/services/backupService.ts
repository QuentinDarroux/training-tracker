import type { BackupData } from '../types'
import { DATA_VERSION } from '../types'
import {
  getAllSessions,
  getAllStrengthPerfs,
  getAllRunningPerfs,
  getSettings,
  getGoals,
  saveSession,
  saveStrengthPerf,
  saveRunningPerf,
  saveSettings,
  saveGoals,
} from './storageService'

export async function exportData(): Promise<BackupData> {
  const [sessions, strengthPerfs, runningPerfs, settings, goals] = await Promise.all([
    getAllSessions(),
    getAllStrengthPerfs(),
    getAllRunningPerfs(),
    getSettings(),
    getGoals(),
  ])
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    sessions,
    strengthPerformances: strengthPerfs,
    runningPerformances: runningPerfs,
    goals,
  }
}

export function downloadJson(data: BackupData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().split('T')[0]
  a.download = `training-tracker-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function validateImportData(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!d.version || !d.exportedAt) return false
  if (!Array.isArray(d.sessions)) return false
  if (!Array.isArray(d.strengthPerformances)) return false
  if (!Array.isArray(d.runningPerformances)) return false
  return true
}

export async function importData(data: BackupData): Promise<void> {
  for (const session of data.sessions) {
    await saveSession(session)
  }
  for (const perf of data.strengthPerformances) {
    await saveStrengthPerf(perf)
  }
  for (const perf of data.runningPerformances) {
    await saveRunningPerf(perf)
  }
  if (data.settings) await saveSettings(data.settings)
  if (data.goals) await saveGoals(data.goals)
}
