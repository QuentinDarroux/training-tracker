import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import type { StrengthPerformance, WorkoutSession, ProgressSuggestion, Workout } from '../types'
import { formatDate } from '../utils/calc'

interface Props {
  strengthPerfs: StrengthPerformance[]
  sessions: WorkoutSession[]
  workouts: Workout[]
  suggestions: ProgressSuggestion[]
}

export default function ExercicesPage({ strengthPerfs, workouts, suggestions }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  // Get all strength exercises
  const allExercises = workouts
    .filter(w => w.type === 'strength')
    .flatMap(w => w.exercises)
  
  // Deduplicate by id
  const exercises = Array.from(new Map(allExercises.map(e => [e.id, e])).values())

  const getPerfsForExercise = (exerciseId: string): StrengthPerformance[] => {
    return strengthPerfs
      .filter(p => p.exerciseId === exerciseId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  const getLastLoad = (exerciseId: string): string => {
    const perf = strengthPerfs
      .filter(p => p.exerciseId === exerciseId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!perf) return '—'
    const set = perf.sets[0]
    if (!set) return '—'
    if (set.weight) return `${set.weight} kg`
    if (set.duration) return `${set.duration}s`
    return `${set.actualReps} reps`
  }

  const getSuggestion = (exerciseId: string): ProgressSuggestion | undefined => {
    return suggestions.find(s => s.exerciseId === exerciseId)
  }

  return (
    <PageLayout title="Exercices">
      <div className="space-y-2">
        {exercises.map(ex => {
          const perfs = getPerfsForExercise(ex.id)
          const suggestion = getSuggestion(ex.id)
          const isSelected = selected === ex.id
          const lastLoad = getLastLoad(ex.id)

          return (
            <div key={ex.id} className="card">
              <div
                className="cursor-pointer"
                onClick={() => setSelected(isSelected ? null : ex.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200">{ex.name}</div>
                    <div className="text-xs text-gray-500">
                      Prévu: {ex.sets}×{ex.reps}{ex.unit === 'seconds' ? 's' : ex.unit === 'minutes' ? 'min' : ''}
                      {ex.side === 'unilateral' ? '/jambe' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">{lastLoad}</div>
                    <div className="text-xs text-gray-500">{perfs.length} séance{perfs.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
                {suggestion && (
                  <div className="mt-2 bg-indigo-900/30 border border-indigo-700 rounded p-2 text-xs text-indigo-300">
                    {suggestion.message}
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  {suggestion && (
                    <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-3 mb-3 text-sm text-indigo-200">
                      <div className="font-medium mb-1">{suggestion.message}</div>
                      <div className="text-xs text-indigo-300">{suggestion.detail}</div>
                    </div>
                  )}
                  
                  {perfs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">Pas encore d'historique</p>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Historique</h4>
                      {perfs.slice(0, 8).map(p => (
                        <div key={p.id} className="bg-gray-700/50 rounded p-2 text-xs">
                          <div className="text-gray-400 mb-1">{formatDate(p.date)}</div>
                          {p.sets.map((s, i) => (
                            <span key={i} className="text-gray-300 mr-2">
                              {s.actualSets}×{s.duration ?? s.actualReps}
                              {s.weight ? `@${s.weight}kg` : ''}
                            </span>
                          ))}
                          {p.tflPain !== undefined && p.tflPain > 0 && (
                            <span className={`ml-1 ${p.tflPain >= 4 ? 'text-red-400' : 'text-gray-500'}`}>
                              TFL:{p.tflPain}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
