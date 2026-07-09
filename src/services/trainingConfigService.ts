import type {
  DatedPlanEntry,
  Exercise,
  TrainingConfig,
  TrainingPlan,
  UserSettings,
  WeeklyPlan,
  Workout,
} from '../types'
import { DATA_VERSION } from '../types'
import { defaultWeeklyPlan } from '../data/weeklyPlan'
import { workouts as defaultWorkouts } from '../data/workouts'
import { getWeekStart, parseLocalDate, toLocalDateString, today } from '../utils/calc'

const dayKeys: (keyof WeeklyPlan)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export function getActiveWorkouts(settings: UserSettings | null): Workout[] {
  return settings?.workouts?.length ? settings.workouts : defaultWorkouts
}

export function getActiveWeeklyPlan(settings: UserSettings | null): WeeklyPlan {
  return settings?.weeklyPlan ?? defaultWeeklyPlan
}

export function getActivePlan(settings: UserSettings | null): TrainingPlan | undefined {
  return settings?.plan
}

export function exportTrainingConfig(settings: UserSettings | null): TrainingConfig {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    ...(settings?.plan ? { plan: settings.plan } : { weeklyPlan: getActiveWeeklyPlan(settings) }),
    workouts: getActiveWorkouts(settings),
  }
}

export async function fetchDeployedTrainingConfig(): Promise<TrainingConfig | null> {
  const configUrl = `${import.meta.env.BASE_URL}data/training-config.json?v=${encodeURIComponent(__BUILD_TIME__)}`
  const res = await fetch(configUrl, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Configuration entraînements indisponible (${res.status}).`)
  const data = await res.json() as unknown
  if (!validateTrainingConfig(data)) {
    throw new Error('Le fichier data/training-config.json déployé est invalide.')
  }
  return data
}

export function applyTrainingConfig(settings: UserSettings, config: TrainingConfig): UserSettings {
  if (!validateTrainingConfig(config)) {
    throw new Error('Configuration entraînements invalide.')
  }
  return {
    ...settings,
    weeklyPlan: config.weeklyPlan ?? settings.weeklyPlan,
    plan: config.plan,
    workouts: config.workouts,
  }
}

export function validateTrainingConfig(data: unknown): data is TrainingConfig {
  if (!isObject(data)) return false
  if (typeof data.version !== 'string') return false
  if (typeof data.exportedAt !== 'string') return false
  if (data.weeklyPlan !== undefined && !isWeeklyPlan(data.weeklyPlan)) return false
  if (data.plan !== undefined && !isTrainingPlan(data.plan)) return false
  if (data.weeklyPlan === undefined && data.plan === undefined) return false
  if (!Array.isArray(data.workouts) || data.workouts.length === 0) return false
  if (!data.workouts.every(isWorkout)) return false

  const workoutIds = new Set(data.workouts.map(workout => workout.id))
  const weeklyPlan = data.weeklyPlan
  if (weeklyPlan && !dayKeys.every(day => workoutIds.has(weeklyPlan[day]))) return false
  if (data.plan?.type === 'dated' && !data.plan.entries.every(entry => workoutIds.has(entry.workoutId))) return false
  return true
}

export function planEntryId(entry: DatedPlanEntry): string {
  return entry.id?.trim() || `${entry.date}-${entry.label}-${entry.workoutId}`
}

export function getPlanEntriesForDate(settings: UserSettings | null, date: string): DatedPlanEntry[] {
  const plan = getActivePlan(settings)
  if (plan?.type === 'dated') {
    return plan.entries
      .filter(entry => entry.date === date)
      .sort((a, b) => planEntryId(a).localeCompare(planEntryId(b)))
  }

  const weeklyPlan = getActiveWeeklyPlan(settings)
  const day = parseLocalDate(date).getDay()
  const dayKeysFromSunday: (keyof WeeklyPlan)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  const dayKey = dayKeysFromSunday[day]
  return [{
    id: `${date}-${dayKey}`,
    date,
    label: dayKey,
    workoutId: weeklyPlan[dayKey],
  }]
}

export function getPlanEntriesForCurrentWeek(settings: UserSettings | null): DatedPlanEntry[] {
  return getPlanEntriesForWeek(settings, getWeekStart(today()))
}

export function getPlanEntriesForWeek(settings: UserSettings | null, weekStartDate: string): DatedPlanEntry[] {
  const start = parseLocalDate(weekStartDate)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return getPlanEntriesForDate(settings, toLocalDateString(date))
  }).flat()
}

export function getAllPlanEntries(settings: UserSettings | null): DatedPlanEntry[] {
  const plan = getActivePlan(settings)
  if (plan?.type === 'dated') {
    return [...plan.entries].sort((a, b) => a.date.localeCompare(b.date) || planEntryId(a).localeCompare(planEntryId(b)))
  }
  return getPlanEntriesForCurrentWeek(settings)
}

function isTrainingPlan(value: unknown): value is TrainingPlan {
  if (!isObject(value)) return false
  if (value.type !== 'dated') return false
  return Array.isArray(value.entries) && value.entries.every(isDatedPlanEntry)
}

function isDatedPlanEntry(value: unknown): value is DatedPlanEntry {
  if (!isObject(value)) return false
  return (value.id === undefined || typeof value.id === 'string')
    && isDateString(value.date)
    && typeof value.label === 'string'
    && value.label.trim().length > 0
    && typeof value.workoutId === 'string'
    && value.workoutId.trim().length > 0
}

function isWeeklyPlan(value: unknown): value is WeeklyPlan {
  if (!isObject(value)) return false
  return dayKeys.every(day => typeof value[day] === 'string' && value[day].trim().length > 0)
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isWorkout(value: unknown): value is Workout {
  if (!isObject(value)) return false
  return typeof value.id === 'string'
    && value.id.trim().length > 0
    && typeof value.title === 'string'
    && value.title.trim().length > 0
    && ['strength', 'running', 'rest'].includes(String(value.type))
    && typeof value.description === 'string'
    && Array.isArray(value.exercises)
    && value.exercises.every(isExercise)
}

function isExercise(value: unknown): value is Exercise {
  if (!isObject(value)) return false
  return typeof value.id === 'string'
    && value.id.trim().length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && typeof value.sets === 'number'
    && typeof value.reps === 'number'
    && ['reps', 'seconds'].includes(String(value.unit))
    && typeof value.trackWeight === 'boolean'
    && typeof value.trackDuration === 'boolean'
    && ['both', 'left', 'right', 'unilateral'].includes(String(value.side))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
