import type { Workout } from '../types'

export const workouts: Workout[] = [
  {
    id: 'renfo_a',
    title: 'Renforcement A',
    type: 'strength',
    description: 'Jambes + core + prévention TFL',
    exercises: [
      { id: 'squat', name: 'Squats', sets: 3, reps: 12, unit: 'reps', trackWeight: true, trackDuration: false, side: 'both' },
      { id: 'fentes', name: 'Fentes', sets: 3, reps: 10, unit: 'reps', trackWeight: true, trackDuration: false, side: 'unilateral' },
      { id: 'hip_thrust', name: 'Hip Thrust', sets: 3, reps: 12, unit: 'reps', trackWeight: true, trackDuration: false, side: 'both' },
      { id: 'planche', name: 'Planche', sets: 3, reps: 30, unit: 'seconds', trackWeight: false, trackDuration: true, side: 'both' },
      { id: 'planche_lat_g', name: 'Planche latérale gauche', sets: 3, reps: 30, unit: 'seconds', trackWeight: false, trackDuration: true, side: 'left' },
      { id: 'planche_lat_d', name: 'Planche latérale droite', sets: 3, reps: 30, unit: 'seconds', trackWeight: false, trackDuration: true, side: 'right' },
    ],
  },
  {
    id: 'renfo_b',
    title: 'Renforcement B',
    type: 'strength',
    description: 'Jambes + fessiers + stabilité hanche',
    exercises: [
      { id: 'step_up', name: 'Step Up', sets: 3, reps: 10, unit: 'reps', trackWeight: true, trackDuration: false, side: 'unilateral' },
      { id: 'sdj_tendues', name: 'Soulevé de terre jambes tendues', sets: 3, reps: 12, unit: 'reps', trackWeight: true, trackDuration: false, side: 'both' },
      { id: 'pont_1jambe', name: 'Pont fessier une jambe', sets: 3, reps: 15, unit: 'reps', trackWeight: false, trackDuration: false, side: 'unilateral' },
      { id: 'clamshell', name: 'Clamshell', sets: 3, reps: 15, unit: 'reps', trackWeight: false, trackDuration: false, side: 'unilateral' },
      { id: 'bird_dog', name: 'Bird Dog', sets: 3, reps: 15, unit: 'reps', trackWeight: false, trackDuration: false, side: 'both' },
    ],
  },
  {
    id: 'footing_ef',
    title: 'Footing EF',
    type: 'running',
    description: 'Endurance fondamentale — allure facile, FC contrôlée, discussion possible. Objectif : base aérobie et récupération active.',
    exercises: [],
  },
  {
    id: 'seance_qualite',
    title: 'Séance qualité',
    type: 'running',
    description: 'Fractionné/tempo léger pour améliorer l\'allure 10km. Exemple : 15min échauffement + 6x(2min rapide / 2min récup) + 10min retour au calme. Charge contrôlée.',
    exercises: [],
  },
  {
    id: 'sortie_longue',
    title: 'Sortie longue',
    type: 'running',
    description: 'Construire l\'endurance, augmenter progressivement la durée. Rester en zone facile (EF). Ne pas forcer le rythme.',
    exercises: [],
  },
  {
    id: 'repos',
    title: 'Repos',
    type: 'rest',
    description: 'Journée de récupération. Étirements légers si souhaité.',
    exercises: [],
  },
]

export function getWorkoutById(id: string): Workout | undefined {
  return workouts.find(w => w.id === id)
}
