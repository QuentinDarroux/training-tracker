import type { WeeklyPlan } from '../types'

export const defaultWeeklyPlan: WeeklyPlan = {
  monday: 'renfo_a',
  tuesday: 'footing_ef',
  wednesday: 'repos',
  thursday: 'seance_qualite',
  friday: 'renfo_b',
  saturday: 'repos',
  sunday: 'sortie_longue',
}

export const dayLabels: Record<keyof WeeklyPlan, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
}

export const dayOrder: (keyof WeeklyPlan)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]
