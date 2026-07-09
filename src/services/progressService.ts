import type { StrengthPerformance, RunningPerformance, WorkoutSession, ProgressSuggestion } from '../types'

export function getStrengthSuggestions(
  strengthPerfs: StrengthPerformance[],
  sessions: WorkoutSession[],
): ProgressSuggestion[] {
  const suggestions: ProgressSuggestion[] = []
  
  // Check TFL global warning first
  const recentTFL = sessions
    .filter(s => s.status === 'done' && s.tflPain !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(s => s.tflPain!)
  
  if (recentTFL.length > 0 && recentTFL[0] >= 4) {
    suggestions.push({
      type: 'tfl_warning',
      message: '⚠️ Douleur TFL élevée',
      detail: `Douleur TFL de ${recentTFL[0]}/10 détectée. Réduire ou stabiliser la charge. Pas de progression recommandée.`,
    })
    return suggestions
  }

  // Group by exerciseId
  const byExercise = new Map<string, StrengthPerformance[]>()
  for (const p of strengthPerfs) {
    const arr = byExercise.get(p.exerciseId) ?? []
    arr.push(p)
    byExercise.set(p.exerciseId, arr)
  }

  for (const [exerciseId, perfs] of byExercise) {
    const sorted = perfs.sort((a, b) => b.date.localeCompare(a.date))
    const last3 = sorted.slice(0, 3)
    if (last3.length < 3) continue

    const allGood = last3.every(p => {
      const sessionForPerf = sessions.find(s => s.id === p.sessionId)
      const ressenti = sessionForPerf?.ressenti ?? 10
      const tfl = p.tflPain ?? 0
      const allSetsDone = p.sets.every(s => s.actualSets >= s.plannedSets && s.actualReps >= s.plannedReps)
      return ressenti <= 7 && tfl <= 2 && allSetsDone
    })

    if (allGood) {
      const latest = last3[0]
      const isWeighted = latest.sets.some(s => (s.weight ?? 0) > 0)
      const exerciseName = latest.exerciseName

      suggestions.push({
        exerciseId,
        exerciseName,
        type: 'strength',
        message: `💪 Progression possible : ${exerciseName}`,
        detail: isWeighted
          ? `Tu as validé cet exercice 3 fois de suite sans douleur significative (TFL ≤ 2, ressenti ≤ 7). Tu peux envisager +2,5 kg ou +1 rep.`
          : `Tu as validé cet exercice 3 fois de suite sans douleur significative. Tu peux envisager +1 répétition ou +1 série.`,
      })
    }
  }

  return suggestions
}

export function getRunningSuggestions(
  runningPerfs: RunningPerformance[],
  sessions: WorkoutSession[],
): ProgressSuggestion[] {
  const suggestions: ProgressSuggestion[] = []

  // Last 3 EF footings
  const efPerfs = runningPerfs
    .filter(p => {
      const session = sessions.find(s => s.id === p.sessionId)
      return p.workoutId === 'footing_ef' && session?.status === 'done'
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)

  if (efPerfs.length < 3) return suggestions

  const recentFatigue = sessions
    .filter(s => s.status === 'done' && s.fatigue !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map(s => s.fatigue!)
  
  const avgFatigue = recentFatigue.length > 0
    ? recentFatigue.reduce((a, b) => a + b, 0) / recentFatigue.length
    : 5

  const allEFGood = efPerfs.every(p => {
    const session = sessions.find(s => s.id === p.sessionId)
    return (p.tflPain ?? 0) <= 2 && (session?.ressenti ?? 10) <= 7
  })

  // Check HR stability
  const hrs = efPerfs.map(p => p.fcMoyenne).filter((h): h is number => h !== undefined)
  const hrStable = hrs.length < 2 || Math.max(...hrs) - Math.min(...hrs) <= 10

  if (allEFGood && hrStable) {
    if (avgFatigue > 7) {
      suggestions.push({
        type: 'running',
        message: '🏃 Maintenir le volume',
        detail: `Fatigue moyenne élevée (${avgFatigue.toFixed(1)}/10). Maintiens le volume actuel avant d'augmenter.`,
      })
    } else {
      suggestions.push({
        type: 'running',
        message: '🏃 Progression possible : Sortie longue',
        detail: `3 footings EF validés sans douleur TFL ni surmenage. Tu peux envisager +5 min sur ta prochaine sortie longue. Règle : ne dépasse pas +10% du volume hebdo.`,
      })
    }
  }

  return suggestions
}
