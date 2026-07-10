import { useState } from 'react'
import PageLayout from '../components/PageLayout'
import EmptyState from '../components/EmptyState'
import SegmentedControl from '../components/SegmentedControl'
import type { WorkoutSession, RunningPerformance, StrengthPerformance } from '../types'
import { formatDate, formatPace, secondsToHMS } from '../utils/calc'
import WorkoutBadge from '../components/WorkoutBadge'

interface Props {
  sessions: WorkoutSession[]
  runningPerfs: RunningPerformance[]
  strengthPerfs: StrengthPerformance[]
  onDeleteSession: (id: string) => Promise<void>
}

export default function HistoriquePage({ sessions, runningPerfs, strengthPerfs, onDeleteSession }: Props) {
  const [filter, setFilter] = useState<'all' | 'running' | 'strength' | 'rest'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = sessions.filter(s => filter === 'all' || s.workoutType === filter)

  const getRunPerf = (sessionId: string) => runningPerfs.find(p => p.sessionId === sessionId)
  const getStrengthPerfs = (sessionId: string) => strengthPerfs.filter(p => p.sessionId === sessionId)

  return (
    <PageLayout title="Historique">
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        className="mb-4 overflow-x-auto"
        options={[
          { value: 'all', label: 'Tout' },
          { value: 'running', label: 'Course' },
          { value: 'strength', label: 'Muscu' },
          { value: 'rest', label: 'Repos' },
        ]}
      />

      {filtered.length === 0 && (
        <EmptyState
          icon="📋"
          title={sessions.length === 0 ? 'Aucune séance enregistrée' : 'Aucun résultat pour ce filtre'}
          description={sessions.length === 0
            ? 'Démarre une séance depuis Aujourd’hui pour construire ton historique.'
            : 'Essaie un autre filtre pour retrouver tes séances.'}
          actionLabel={sessions.length === 0 ? 'Voir aujourd’hui' : undefined}
          actionTo={sessions.length === 0 ? '/aujourd-hui' : undefined}
        />
      )}

      <div className="space-y-2">
        {filtered.map(session => {
          const runPerf = getRunPerf(session.id)
          const strPerfs = getStrengthPerfs(session.id)
          const isExpanded = expanded === session.id

          return (
            <div key={session.id} className="card">
              <div
                className="cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WorkoutBadge type={session.workoutType} title={session.workoutTitle} compact />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={
                      session.status === 'done' ? 'badge-done' :
                      session.status === 'skipped' ? 'badge-skipped' : 'badge-planned'
                    }>
                      {session.status === 'done' ? '✓' : session.status === 'skipped' ? '–' : '○'}
                    </span>
                    <span className="text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(session.date)}</div>
                
                {/* Quick stats row */}
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {session.duration && <span>⏱ {session.duration}min</span>}
                  {runPerf?.distanceKm && <span>📍 {runPerf.distanceKm}km</span>}
                  {runPerf?.avgPaceSecondsPerKm && <span>⚡ {formatPace(runPerf.avgPaceSecondsPerKm)}</span>}
                  {runPerf?.fcMoyenne && <span>❤️ {runPerf.fcMoyenne}bpm</span>}
                  {session.ressenti !== undefined && <span>😊 {session.ressenti}/10</span>}
                  {session.tflPain !== undefined && session.tflPain > 0 && (
                    <span className={session.tflPain >= 4 ? 'text-red-400' : ''}>
                      🦵 TFL:{session.tflPain}
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                  {session.fatigue !== undefined && (
                    <div className="text-sm text-gray-400">Fatigue: {session.fatigue}/10</div>
                  )}
                  {session.notes && (
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-500">Notes: </span>{session.notes}
                    </div>
                  )}
                  
                  {/* Running detail */}
                  {runPerf && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-xs space-y-1">
                      <div className="font-medium text-gray-300 mb-1">Détail course</div>
                      {runPerf.distanceKm && <div>Distance: {runPerf.distanceKm} km</div>}
                      {runPerf.durationSeconds && <div>Durée: {secondsToHMS(runPerf.durationSeconds)}</div>}
                      {runPerf.avgPaceSecondsPerKm && <div>Allure: {formatPace(runPerf.avgPaceSecondsPerKm)}</div>}
                      {runPerf.fcMoyenne && <div>FC moy: {runPerf.fcMoyenne} bpm</div>}
                      {runPerf.fcMax && <div>FC max: {runPerf.fcMax} bpm</div>}
                      {runPerf.temperature !== undefined && <div>Temp: {runPerf.temperature}°C</div>}
                      {runPerf.terrain && <div>Terrain: {runPerf.terrain}</div>}
                      {runPerf.comment && <div>Note: {runPerf.comment}</div>}
                    </div>
                  )}
                  
                  {/* Strength detail */}
                  {strPerfs.length > 0 && (
                    <div className="bg-gray-700/50 rounded-lg p-2 text-xs space-y-1">
                      <div className="font-medium text-gray-300 mb-1">Détail muscu</div>
                      {strPerfs.map(sp => (
                        <div key={sp.id}>
                          <span className="text-gray-300">{sp.exerciseName}: </span>
                          {sp.sets.map((s, i) => (
                            <span key={i} className="text-gray-400">
                              {s.actualSets}×{s.duration ?? s.actualReps}
                              {s.weight ? `@${s.weight}kg` : ''}
                              {' '}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
