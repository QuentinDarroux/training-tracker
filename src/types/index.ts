export type WorkoutType = 'strength' | 'running' | 'rest'

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  unit: 'reps' | 'seconds' | 'minutes'
  trackWeight: boolean
  trackDuration: boolean
  side: 'both' | 'left' | 'right' | 'unilateral'
}

export interface Workout {
  id: string
  title: string
  type: WorkoutType
  description: string
  exercises: Exercise[]
}

export interface WeeklyPlan {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

// Loosely-typed value/range used inside goals.intensite / goals.travail.
// Shapes vary a lot (numeric HR range, pace strings, rpe, distance, textual rest...),
// so we keep it permissive and only render what's present.
export interface GoalTarget {
  min?: number | string
  max?: number | string
  value?: number | string
  unit?: string
  sets?: string
  mode?: string
  [key: string]: unknown
}

export interface GoalIntensite {
  type: string // e.g. 'rpe' | 'heart_rate' | 'pace' | 'rest' | 'duration' | ...
  target?: GoalTarget
  [key: string]: unknown
}

export interface GoalWorkBlock {
  duration?: number
  unit?: string
  [key: string]: unknown
}

export interface GoalMainSet {
  repetitions?: number
  work?: GoalWorkBlock
  recovery?: GoalWorkBlock
  [key: string]: unknown
}

export interface GoalTravail {
  type: string // e.g. 'strength' | 'distance' | 'interval' | 'rest' | 'duration' | 'mixed_distance' | ...
  target?: GoalTarget
  warmup?: GoalWorkBlock
  mainSet?: GoalMainSet
  cooldown?: GoalWorkBlock
  [key: string]: unknown
}

export interface GoalNutrition {
  fromDistanceKm?: number
  suggestion?: string
  [key: string]: unknown
}

export interface PlanEntryGoals {
  objective?: string
  rpe?: number
  estimatedDurationMin?: number
  intensite?: GoalIntensite
  travail?: GoalTravail
  nutrition?: GoalNutrition
  rawWorkout?: string
  [key: string]: unknown
}

export interface DatedPlanEntry {
  id?: string
  date: string // YYYY-MM-DD
  label: string
  workoutId: string
  goals?: PlanEntryGoals
}

export interface DatedTrainingPlan {
  type: 'dated'
  entries: DatedPlanEntry[]
}

export type TrainingPlan = DatedTrainingPlan

// Program-level metadata (race target, zones...). Purely informational, kept
// loose since agents may attach extra fields we don't explicitly render.
export interface TrainingConfigMetadata {
  name?: string
  startDate?: string
  raceDate?: string
  targetTime?: string
  targetPace?: string
  schema?: string
  zones?: Record<string, unknown>
  [key: string]: unknown
}

export interface WorkoutSession {
  id: string
  date: string // ISO date string YYYY-MM-DD
  workoutId: string
  workoutTitle: string
  workoutType: WorkoutType
  planEntryId?: string
  planLabel?: string
  planGoals?: PlanEntryGoals
  status: 'planned' | 'done' | 'skipped'
  ressenti?: number // 1-10
  fatigue?: number // 1-10
  tflPain?: number // 0-10
  notes?: string
  duration?: number // minutes
  createdAt: string
  updatedAt: string
}

export interface StrengthSet {
  plannedSets: number
  actualSets: number
  plannedReps: number
  actualReps: number
  weight?: number // kg, 0 for bodyweight
  duration?: number // seconds for timed exercises
  comment?: string
  pain?: number // 0-10
}

export interface StrengthPerformance {
  id: string
  sessionId: string
  date: string
  workoutId: string
  exerciseId: string
  exerciseName: string
  sets: StrengthSet[]
  tflPain?: number
  createdAt: string
}

export interface RunningPerformance {
  id: string
  sessionId: string
  date: string
  workoutId: string
  workoutTitle: string
  distanceKm?: number
  durationSeconds?: number
  avgPaceSecondsPerKm?: number // auto-calculated
  fcMoyenne?: number
  fcMax?: number
  temperature?: number
  rpe?: number // 1-10
  tflPain?: number // 0-10
  comment?: string
  terrain?: 'plat' | 'vallonné' | 'trail' | 'tapis'
  meteo?: string
  createdAt: string
}

export interface UserGoal {
  goal10kSeconds?: number // target 10k in seconds
  goalHalfMarathonSeconds?: number
  fcMax?: number
  efZoneLow?: number
  efZoneHigh?: number
  weightKg?: number
  weeklyVolumeKm?: number
  weeklySessionCount?: number
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system'
  weeklyPlan: WeeklyPlan
  plan?: TrainingPlan
  workouts?: Workout[]
  metadata?: TrainingConfigMetadata
  trainingConfigUpdatedAt?: string
  lastLocalBackup?: string
  githubBackup?: GithubBackupConfig
}

export interface GithubBackupConfig {
  owner: string
  repo: string
  branch: string
  filePath: string
  configFilePath?: string
  // token is NEVER stored here
}

export interface TrainingConfig {
  version: string
  exportedAt: string
  weeklyPlan?: WeeklyPlan
  plan?: TrainingPlan
  workouts: Workout[]
  metadata?: TrainingConfigMetadata
}

export interface BackupData {
  version: string
  exportedAt: string
  settings: UserSettings
  sessions: WorkoutSession[]
  strengthPerformances: StrengthPerformance[]
  runningPerformances: RunningPerformance[]
  goals: UserGoal
}

export interface ProgressSuggestion {
  exerciseId?: string
  exerciseName?: string
  type: 'strength' | 'running' | 'tfl_warning'
  message: string
  detail: string
}

export const DATA_VERSION = '1.0.0'
