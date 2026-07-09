import type { BackupData } from '../types'
import { DATA_VERSION } from '../types'
import {
  getAllSessions,
  getAllStrengthPerfs,
  getAllRunningPerfs,
  getSettings,
  getGoals,
  importBackupData,
} from './storageService'
import { toLocalDateString } from '../utils/calc'

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
  const date = toLocalDateString(new Date())
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
  if (!isObject(d.settings)) return false
  if (!isObject(d.goals)) return false
  return d.sessions.every(isWorkoutSession)
    && d.strengthPerformances.every(isStrengthPerformance)
    && d.runningPerformances.every(isRunningPerformance)
}

export async function importData(data: BackupData): Promise<void> {
  if (!validateImportData(data)) {
    throw new Error('Le fichier de sauvegarde est invalide.')
  }
  await importBackupData(data)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isNumberOrUndefined(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number'
}

function isWorkoutSession(value: unknown): boolean {
  if (!isObject(value)) return false
  return typeof value.id === 'string'
    && isDateString(value.date)
    && typeof value.workoutId === 'string'
    && typeof value.workoutTitle === 'string'
    && ['strength', 'running', 'rest'].includes(String(value.workoutType))
    && ['planned', 'done', 'skipped'].includes(String(value.status))
    && isNumberOrUndefined(value.ressenti)
    && isNumberOrUndefined(value.fatigue)
    && isNumberOrUndefined(value.tflPain)
    && isNumberOrUndefined(value.duration)
    && isIsoDateTime(value.createdAt)
    && isIsoDateTime(value.updatedAt)
}

function isStrengthPerformance(value: unknown): boolean {
  if (!isObject(value)) return false
  return typeof value.id === 'string'
    && typeof value.sessionId === 'string'
    && isDateString(value.date)
    && typeof value.workoutId === 'string'
    && typeof value.exerciseId === 'string'
    && typeof value.exerciseName === 'string'
    && Array.isArray(value.sets)
    && value.sets.every(isStrengthSet)
    && isNumberOrUndefined(value.tflPain)
    && isIsoDateTime(value.createdAt)
}

function isStrengthSet(value: unknown): boolean {
  if (!isObject(value)) return false
  return typeof value.plannedSets === 'number'
    && typeof value.actualSets === 'number'
    && typeof value.plannedReps === 'number'
    && typeof value.actualReps === 'number'
    && isNumberOrUndefined(value.weight)
    && isNumberOrUndefined(value.duration)
    && isNumberOrUndefined(value.pain)
}

function isRunningPerformance(value: unknown): boolean {
  if (!isObject(value)) return false
  return typeof value.id === 'string'
    && typeof value.sessionId === 'string'
    && isDateString(value.date)
    && typeof value.workoutId === 'string'
    && typeof value.workoutTitle === 'string'
    && isNumberOrUndefined(value.distanceKm)
    && isNumberOrUndefined(value.durationSeconds)
    && isNumberOrUndefined(value.avgPaceSecondsPerKm)
    && isNumberOrUndefined(value.fcMoyenne)
    && isNumberOrUndefined(value.fcMax)
    && isNumberOrUndefined(value.temperature)
    && isNumberOrUndefined(value.rpe)
    && isNumberOrUndefined(value.tflPain)
    && (value.terrain === undefined || ['plat', 'vallonné', 'trail', 'tapis'].includes(String(value.terrain)))
    && isIsoDateTime(value.createdAt)
}
