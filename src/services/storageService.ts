import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  WorkoutSession,
  StrengthPerformance,
  RunningPerformance,
  UserSettings,
  UserGoal,
  BackupData,
} from '../types'
import { defaultWeeklyPlan } from '../data/weeklyPlan'

const DB_NAME = 'training-tracker'
const DB_VERSION = 1

interface SettingsRow {
  key: string
  value: UserSettings | UserGoal
}

interface TrainingTrackerDB extends DBSchema {
  sessions: {
    key: string
    value: WorkoutSession
    indexes: { date: string; workoutId: string }
  }
  strengthPerfs: {
    key: string
    value: StrengthPerformance
    indexes: { date: string; exerciseId: string; sessionId: string }
  }
  runningPerfs: {
    key: string
    value: RunningPerformance
    indexes: { date: string; sessionId: string }
  }
  settings: {
    key: string
    value: SettingsRow
  }
}

let db: IDBPDatabase<TrainingTrackerDB> | null = null

async function getDB(): Promise<IDBPDatabase<TrainingTrackerDB>> {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('sessions')) {
        const sessions = database.createObjectStore('sessions', { keyPath: 'id' })
        sessions.createIndex('date', 'date')
        sessions.createIndex('workoutId', 'workoutId')
      }
      if (!database.objectStoreNames.contains('strengthPerfs')) {
        const sp = database.createObjectStore('strengthPerfs', { keyPath: 'id' })
        sp.createIndex('date', 'date')
        sp.createIndex('exerciseId', 'exerciseId')
        sp.createIndex('sessionId', 'sessionId')
      }
      if (!database.objectStoreNames.contains('runningPerfs')) {
        const rp = database.createObjectStore('runningPerfs', { keyPath: 'id' })
        rp.createIndex('date', 'date')
        rp.createIndex('sessionId', 'sessionId')
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' })
      }
    },
  })
  return db
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  weeklyPlan: defaultWeeklyPlan,
}

const defaultGoals: UserGoal = {
  goal10kSeconds: 50 * 60,
  goalHalfMarathonSeconds: (1 * 3600) + (55 * 60),
  fcMax: 195,
  efZoneLow: 135,
  efZoneHigh: 155,
  weeklyVolumeKm: 30,
  weeklySessionCount: 5,
}

// Settings
export async function getSettings(): Promise<UserSettings> {
  try {
    const db = await getDB()
    const row = await db.get('settings', 'settings')
    return row ? row.value as UserSettings : defaultSettings
  } catch {
    const raw = localStorage.getItem('tt_settings')
    return raw ? JSON.parse(raw) : defaultSettings
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    const db = await getDB()
    await db.put('settings', { key: 'settings', value: settings })
  } catch {
    localStorage.setItem('tt_settings', JSON.stringify(settings))
  }
}

// Goals
export async function getGoals(): Promise<UserGoal> {
  try {
    const db = await getDB()
    const row = await db.get('settings', 'goals')
    return row ? row.value as UserGoal : defaultGoals
  } catch {
    const raw = localStorage.getItem('tt_goals')
    return raw ? JSON.parse(raw) : defaultGoals
  }
}

export async function saveGoals(goals: UserGoal): Promise<void> {
  try {
    const db = await getDB()
    await db.put('settings', { key: 'goals', value: goals })
  } catch {
    localStorage.setItem('tt_goals', JSON.stringify(goals))
  }
}

// Sessions
export async function getAllSessions(): Promise<WorkoutSession[]> {
  try {
    const db = await getDB()
    return await db.getAll('sessions')
  } catch {
    const raw = localStorage.getItem('tt_sessions')
    return raw ? JSON.parse(raw) : []
  }
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  try {
    const db = await getDB()
    await db.put('sessions', session)
  } catch {
    const all = await getAllSessions()
    const idx = all.findIndex(s => s.id === session.id)
    if (idx >= 0) all[idx] = session
    else all.push(session)
    localStorage.setItem('tt_sessions', JSON.stringify(all))
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(['sessions', 'strengthPerfs', 'runningPerfs'], 'readwrite')
    const strengthStore = tx.objectStore('strengthPerfs')
    const runningStore = tx.objectStore('runningPerfs')
    const strengthKeys = await strengthStore.index('sessionId').getAllKeys(id)
    const runningKeys = await runningStore.index('sessionId').getAllKeys(id)
    await Promise.all([
      tx.objectStore('sessions').delete(id),
      ...strengthKeys.map(key => strengthStore.delete(key)),
      ...runningKeys.map(key => runningStore.delete(key)),
    ])
    await tx.done
  } catch {
    const [sessions, strengthPerfs, runningPerfs] = await Promise.all([
      getAllSessions(),
      getAllStrengthPerfs(),
      getAllRunningPerfs(),
    ])
    localStorage.setItem('tt_sessions', JSON.stringify(sessions.filter(s => s.id !== id)))
    localStorage.setItem('tt_strength', JSON.stringify(strengthPerfs.filter(p => p.sessionId !== id)))
    localStorage.setItem('tt_running', JSON.stringify(runningPerfs.filter(p => p.sessionId !== id)))
  }
}

// Strength performances
export async function getAllStrengthPerfs(): Promise<StrengthPerformance[]> {
  try {
    const db = await getDB()
    return await db.getAll('strengthPerfs')
  } catch {
    const raw = localStorage.getItem('tt_strength')
    return raw ? JSON.parse(raw) : []
  }
}

export async function saveStrengthPerf(perf: StrengthPerformance): Promise<void> {
  try {
    const db = await getDB()
    await db.put('strengthPerfs', perf)
  } catch {
    const all = await getAllStrengthPerfs()
    const idx = all.findIndex(p => p.id === perf.id)
    if (idx >= 0) all[idx] = perf
    else all.push(perf)
    localStorage.setItem('tt_strength', JSON.stringify(all))
  }
}

export async function deleteStrengthPerf(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('strengthPerfs', id)
  } catch {
    const all = await getAllStrengthPerfs()
    localStorage.setItem('tt_strength', JSON.stringify(all.filter(p => p.id !== id)))
  }
}

// Running performances
export async function getAllRunningPerfs(): Promise<RunningPerformance[]> {
  try {
    const db = await getDB()
    return await db.getAll('runningPerfs')
  } catch {
    const raw = localStorage.getItem('tt_running')
    return raw ? JSON.parse(raw) : []
  }
}

export async function saveRunningPerf(perf: RunningPerformance): Promise<void> {
  try {
    const db = await getDB()
    await db.put('runningPerfs', perf)
  } catch {
    const all = await getAllRunningPerfs()
    const idx = all.findIndex(p => p.id === perf.id)
    if (idx >= 0) all[idx] = perf
    else all.push(perf)
    localStorage.setItem('tt_running', JSON.stringify(all))
  }
}

export async function deleteRunningPerf(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('runningPerfs', id)
  } catch {
    const all = await getAllRunningPerfs()
    localStorage.setItem('tt_running', JSON.stringify(all.filter(p => p.id !== id)))
  }
}

// Reset all data
export async function resetAllData(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear('sessions')
    await db.clear('strengthPerfs')
    await db.clear('runningPerfs')
    await db.delete('settings', 'goals')
    await db.delete('settings', 'settings')
  } catch {
    localStorage.removeItem('tt_sessions')
    localStorage.removeItem('tt_strength')
    localStorage.removeItem('tt_running')
    localStorage.removeItem('tt_settings')
    localStorage.removeItem('tt_goals')
  }
}

export async function importBackupData(data: BackupData): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(['sessions', 'strengthPerfs', 'runningPerfs', 'settings'], 'readwrite')
    await Promise.all([
      ...data.sessions.map(session => tx.objectStore('sessions').put(session)),
      ...data.strengthPerformances.map(perf => tx.objectStore('strengthPerfs').put(perf)),
      ...data.runningPerformances.map(perf => tx.objectStore('runningPerfs').put(perf)),
      tx.objectStore('settings').put({ key: 'settings', value: data.settings }),
      tx.objectStore('settings').put({ key: 'goals', value: data.goals }),
    ])
    await tx.done
  } catch {
    const [sessions, strengthPerfs, runningPerfs] = await Promise.all([
      getAllSessions(),
      getAllStrengthPerfs(),
      getAllRunningPerfs(),
    ])
    const mergedSessions = upsertById(sessions, data.sessions)
    const mergedStrength = upsertById(strengthPerfs, data.strengthPerformances)
    const mergedRunning = upsertById(runningPerfs, data.runningPerformances)
    localStorage.setItem('tt_sessions', JSON.stringify(mergedSessions))
    localStorage.setItem('tt_strength', JSON.stringify(mergedStrength))
    localStorage.setItem('tt_running', JSON.stringify(mergedRunning))
    localStorage.setItem('tt_settings', JSON.stringify(data.settings))
    localStorage.setItem('tt_goals', JSON.stringify(data.goals))
  }
}

function upsertById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const merged = new Map(existing.map(item => [item.id, item]))
  for (const item of incoming) merged.set(item.id, item)
  return [...merged.values()]
}
