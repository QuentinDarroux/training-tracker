import type { GoalTarget, GoalTravail, PlanEntryGoals } from '../types'

function formatTargetValue(target: GoalTarget | undefined): string | null {
  if (!target) return null
  const unit = target.unit ? ` ${target.unit}` : ''
  if (target.min !== undefined && target.max !== undefined) {
    return `${target.min}-${target.max}${unit}`
  }
  if (target.value !== undefined) {
    return `${target.value}${unit}`
  }
  return null
}

/** Short one-line summary shown in list rows (planning, today). */
export function formatGoalHeadline(goals: PlanEntryGoals | undefined): string | null {
  if (!goals) return null
  const parts: string[] = []
  if (goals.rpe !== undefined) parts.push(`RPE ${goals.rpe}`)
  if (goals.estimatedDurationMin) parts.push(`~${goals.estimatedDurationMin}min`)
  const intensiteValue = formatTargetValue(goals.intensite?.target)
  if (intensiteValue) parts.push(intensiteValue)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Detailed, human readable lines shown on today/session cards. */
export function formatGoalDetails(goals: PlanEntryGoals | undefined): string[] {
  if (!goals) return []
  const lines: string[] = []

  if (goals.objective) lines.push(goals.objective)

  const travailLine = formatTravail(goals.travail)
  if (travailLine) lines.push(travailLine)

  const intensiteValue = formatTargetValue(goals.intensite?.target)
  if (intensiteValue) {
    const label = intensiteLabel(goals.intensite?.type)
    lines.push(label ? `${label} : ${intensiteValue}` : intensiteValue)
  }

  if (goals.rawWorkout) lines.push(`Détail : ${goals.rawWorkout}`)

  if (goals.nutrition?.suggestion) {
    lines.push(`🍽️ ${goals.nutrition.suggestion}`)
  }

  return lines
}

function intensiteLabel(type: string | undefined): string | null {
  switch (type) {
    case 'heart_rate': return 'FC cible'
    case 'pace': return 'Allure cible'
    case 'rpe': return 'RPE cible'
    case 'rest': return 'Intensité'
    case 'duration': return 'Durée cible'
    default: return null
  }
}

function formatTravail(travail: GoalTravail | undefined): string | null {
  if (!travail) return null

  if (travail.type === 'interval' && travail.mainSet) {
    const { repetitions, work, recovery } = travail.mainSet
    if (repetitions && work) {
      const workStr = `${work.duration}${work.unit === 'min' ? 'min' : work.unit ?? ''}`
      const recoveryStr = recovery ? `${recovery.duration}${recovery.unit === 'min' ? 'min' : recovery.unit ?? ''}` : null
      return recoveryStr
        ? `${repetitions}x ${workStr} rapide / ${recoveryStr} récup`
        : `${repetitions}x ${workStr}`
    }
  }

  const targetValue = formatTargetValue(travail.target)
  if (travail.type === 'distance' && targetValue) return `Distance : ${targetValue}`
  if (travail.type === 'strength' && travail.target) {
    const bits = [travail.target.sets, travail.target.mode].filter(Boolean)
    return bits.length > 0 ? bits.join(' · ') : null
  }
  if (targetValue) return targetValue

  return null
}
