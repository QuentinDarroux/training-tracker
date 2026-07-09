import type { Exercise, TrainingConfig, UserSettings, WeeklyPlan, Workout } from '../types'
import { DATA_VERSION } from '../types'
import { defaultWeeklyPlan } from '../data/weeklyPlan'
import { workouts as defaultWorkouts } from '../data/workouts'

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

export function exportTrainingConfig(settings: UserSettings | null): TrainingConfig {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    weeklyPlan: getActiveWeeklyPlan(settings),
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
    weeklyPlan: config.weeklyPlan,
    workouts: config.workouts,
  }
}

export function validateTrainingConfig(data: unknown): data is TrainingConfig {
  if (!isObject(data)) return false
  if (typeof data.version !== 'string') return false
  if (typeof data.exportedAt !== 'string') return false
  if (!isWeeklyPlan(data.weeklyPlan)) return false
  if (!Array.isArray(data.workouts) || data.workouts.length === 0) return false
  if (!data.workouts.every(isWorkout)) return false

  const plan = data.weeklyPlan
  const workoutIds = new Set(data.workouts.map(workout => workout.id))
  return dayKeys.every(day => workoutIds.has(plan[day]))
}

function isWeeklyPlan(value: unknown): value is WeeklyPlan {
  if (!isObject(value)) return false
  return dayKeys.every(day => typeof value[day] === 'string' && value[day].trim().length > 0)
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
