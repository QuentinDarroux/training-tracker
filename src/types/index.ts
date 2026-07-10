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

export interface DatedPlanEntry {
  id?: string
  date: string // YYYY-MM-DD
  label: string
  workoutId: string
}

export interface DatedTrainingPlan {
  type: 'dated'
  entries: DatedPlanEntry[]
}

export type TrainingPlan = DatedTrainingPlan

export interface WorkoutSession {
  id: string
  date: string // ISO date string YYYY-MM-DD
  workoutId: string
  workoutTitle: string
  workoutType: WorkoutType
  planEntryId?: string
  planLabel?: string
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
