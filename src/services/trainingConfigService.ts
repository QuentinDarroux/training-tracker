import type {
  DatedPlanEntry,
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
    trainingConfigUpdatedAt: new Date().toISOString(),
  }
}

export function validateTrainingConfig(data: unknown): data is TrainingConfig {
  return getTrainingConfigValidationErrors(data).length === 0
}

export function getTrainingConfigValidationErrors(data: unknown): string[] {
  const errors: string[] = []
  if (!isObject(data)) return ['La configuration doit être un objet JSON.']
  if (typeof data.version !== 'string') errors.push('`version` doit être une chaîne.')
  if (typeof data.exportedAt !== 'string') errors.push('`exportedAt` doit être une chaîne ISO.')
  if (data.weeklyPlan !== undefined && !isWeeklyPlan(data.weeklyPlan)) {
    errors.push('`weeklyPlan` est invalide: il doit contenir monday..sunday avec des ids non vides.')
  }
  if (data.plan !== undefined && !isTrainingPlan(data.plan)) {
    errors.push('`plan` est invalide: seul `{ "type": "dated", "entries": [...] }` est supporté.')
  }
  if (data.weeklyPlan === undefined && data.plan === undefined) {
    errors.push('La configuration doit contenir `plan` ou `weeklyPlan`.')
  }
  if (!Array.isArray(data.workouts) || data.workouts.length === 0) {
    errors.push('`workouts` doit être un tableau non vide.')
  } else {
    data.workouts.forEach((workout, index) => {
      errors.push(...getWorkoutValidationErrors(workout, `workouts[${index}]`))
    })
  }

  if (errors.length > 0) return errors

  const workouts = data.workouts as Workout[]
  const weeklyPlan = data.weeklyPlan as WeeklyPlan | undefined
  const plan = data.plan as TrainingPlan | undefined
  const workoutIds = new Set(workouts.map(workout => workout.id))
  if (weeklyPlan) {
    for (const day of dayKeys) {
      if (!workoutIds.has(weeklyPlan[day])) {
        errors.push(`weeklyPlan.${day} référence un workout inexistant: ${weeklyPlan[day]}`)
      }
    }
  }
  if (plan?.type === 'dated') {
    plan.entries.forEach((entry, index) => {
      if (!workoutIds.has(entry.workoutId)) {
        errors.push(`plan.entries[${index}].workoutId référence un workout inexistant: ${entry.workoutId}`)
      }
    })
  }
  return errors
}

export function trainingConfigPrompt(): string {
  return `Generate a valid Training Tracker training-config.json.

Return JSON only. Do not wrap it in markdown.

Accepted top-level shape:
{
  "version": "1.0.0",
  "exportedAt": "<ISO datetime>",
  "plan": {
    "type": "dated",
    "entries": [
      { "date": "YYYY-MM-DD", "label": "Matin", "workoutId": "renfo_a" }
    ]
  },
  "workouts": []
}

Rules:
1. Use either "plan" or legacy "weeklyPlan"; prefer "plan".
2. For "plan", only { "type": "dated", "entries": [...] } is supported.
3. plan.entries[] fields:
   - optional "id": string
   - "date": string in YYYY-MM-DD format
   - "label": non-empty string displayed to the user
   - "workoutId": non-empty string matching one existing workouts[].id
4. Multiple entries may have the same date.
5. workouts[] must be a non-empty array.
6. Workout fields:
   - "id": non-empty stable string, preferably lowercase snake_case
   - "title": non-empty string
   - "type": one of "strength", "running", "rest"
   - "description": string
   - "exercises": array
7. Running and rest workouts should usually have "exercises": [].
8. Exercise fields:
   - "id": non-empty stable string
   - "name": non-empty string
   - "sets": number
   - "reps": number
   - "unit": one of "reps", "seconds", "minutes"
   - "trackWeight": boolean
   - "trackDuration": boolean
   - "side": one of "both", "left", "right", "unilateral"
9. Every plan entry workoutId must exist in workouts.
10. Do not invent unsupported fields unless they are harmless metadata at top level.
11. Preserve stable workout and exercise ids when updating an existing plan, because history is linked by ids.

Example:
{
  "version": "1.0.0",
  "exportedAt": "2026-07-10T08:00:00.000Z",
  "plan": {
    "type": "dated",
    "entries": [
      { "date": "2026-07-20", "label": "J1 matin", "workoutId": "renfo_a" },
      { "date": "2026-07-20", "label": "J1 après-midi", "workoutId": "footing_ef" },
      { "date": "2026-07-21", "label": "J2 repos", "workoutId": "repos" }
    ]
  },
  "workouts": [
    {
      "id": "renfo_a",
      "title": "Renforcement A",
      "type": "strength",
      "description": "Jambes + core",
      "exercises": [
        {
          "id": "squat",
          "name": "Squats",
          "sets": 3,
          "reps": 12,
          "unit": "reps",
          "trackWeight": true,
          "trackDuration": false,
          "side": "both"
        }
      ]
    },
    {
      "id": "footing_ef",
      "title": "Footing EF",
      "type": "running",
      "description": "Endurance fondamentale facile.",
      "exercises": []
    },
    {
      "id": "repos",
      "title": "Repos",
      "type": "rest",
      "description": "Récupération.",
      "exercises": []
    }
  ]
}`
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

function getWorkoutValidationErrors(value: unknown, path: string): string[] {
  const errors: string[] = []
  if (!isObject(value)) return [`${path} doit être un objet.`]
  if (typeof value.id !== 'string' || !value.id.trim()) errors.push(`${path}.id doit être une chaîne non vide.`)
  if (typeof value.title !== 'string' || !value.title.trim()) errors.push(`${path}.title doit être une chaîne non vide.`)
  if (!['strength', 'running', 'rest'].includes(String(value.type))) errors.push(`${path}.type doit être strength, running ou rest.`)
  if (typeof value.description !== 'string') errors.push(`${path}.description doit être une chaîne.`)
  if (!Array.isArray(value.exercises)) {
    errors.push(`${path}.exercises doit être un tableau.`)
  } else {
    value.exercises.forEach((exercise, index) => {
      errors.push(...getExerciseValidationErrors(exercise, `${path}.exercises[${index}]`))
    })
  }
  return errors
}

function getExerciseValidationErrors(value: unknown, path: string): string[] {
  const errors: string[] = []
  if (!isObject(value)) return [`${path} doit être un objet.`]
  if (typeof value.id !== 'string' || !value.id.trim()) errors.push(`${path}.id doit être une chaîne non vide.`)
  if (typeof value.name !== 'string' || !value.name.trim()) errors.push(`${path}.name doit être une chaîne non vide.`)
  if (typeof value.sets !== 'number') errors.push(`${path}.sets doit être un nombre.`)
  if (typeof value.reps !== 'number') errors.push(`${path}.reps doit être un nombre.`)
  if (!['reps', 'seconds', 'minutes'].includes(String(value.unit))) {
    errors.push(`${path}.unit doit être reps, seconds ou minutes.`)
  }
  if (typeof value.trackWeight !== 'boolean') errors.push(`${path}.trackWeight doit être un booléen.`)
  if (typeof value.trackDuration !== 'boolean') errors.push(`${path}.trackDuration doit être un booléen.`)
  if (!['both', 'left', 'right', 'unilateral'].includes(String(value.side))) {
    errors.push(`${path}.side doit être both, left, right ou unilateral.`)
  }
  return errors
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
