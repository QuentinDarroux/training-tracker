/** Format seconds to mm:ss or hh:mm:ss */
export function secondsToHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${m}:${ss}`
}

/** Parse mm:ss or hh:mm:ss to total seconds */
export function hmsToSeconds(hms: string): number {
  const parts = hms.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

/** Calculate pace in seconds per km */
export function calcPace(distanceKm: number, durationSeconds: number): number {
  if (!distanceKm || distanceKm <= 0) return 0
  return Math.round(durationSeconds / distanceKm)
}

/** Format pace seconds/km as min:ss/km */
export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--'
  const m = Math.floor(secondsPerKm / 60)
  const s = secondsPerKm % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}

/** Format a Date as a local YYYY-MM-DD calendar date. */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Parse a YYYY-MM-DD calendar date in local time, not UTC. */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Get local date string for today */
export function today(): string {
  return toLocalDateString(new Date())
}

/** Get start of ISO week (Monday) for a given date string */
export function getWeekStart(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return toLocalDateString(d)
}

/** Get week start for today */
export function thisWeekStart(): string {
  return getWeekStart(today())
}

/** Get date string N days from today */
export function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toLocalDateString(d)
}

/** Check if a date string is in the current week (Mon-Sun) */
export function isThisWeek(dateStr: string): boolean {
  const weekStart = thisWeekStart()
  const d = parseLocalDate(dateStr)
  const ws = parseLocalDate(weekStart)
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  return d >= ws && d <= we
}

/** Calculate weekly running volume in km for given sessions and their running performances */
export function weeklyRunningVolume(
  runningPerfs: { date: string; distanceKm?: number }[]
): number {
  return runningPerfs
    .filter(p => isThisWeek(p.date))
    .reduce((sum, p) => sum + (p.distanceKm ?? 0), 0)
}

/** Calculate adherence rate: done / (done + skipped) for given sessions */
export function adherenceRate(sessions: { status: string }[]): number {
  const relevant = sessions.filter(s => s.status === 'done' || s.status === 'skipped')
  if (relevant.length === 0) return 0
  const done = sessions.filter(s => s.status === 'done').length
  return Math.round((done / relevant.length) * 100)
}

/** Detect TFL pain trend: returns 'increasing', 'stable', or 'decreasing' */
export function tflPainTrend(pains: number[]): 'increasing' | 'stable' | 'decreasing' {
  if (pains.length < 2) return 'stable'
  const recent = pains.slice(-3)
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const older = pains.slice(0, -3)
  if (older.length === 0) return 'stable'
  const recentAvg = avg(recent)
  const olderAvg = avg(older)
  if (recentAvg > olderAvg + 1) return 'increasing'
  if (recentAvg < olderAvg - 1) return 'decreasing'
  return 'stable'
}

/** Detect volume overload: returns true if this week volume > last week + 10% */
export function isVolumeOverload(thisWeekKm: number, lastWeekKm: number): boolean {
  if (lastWeekKm <= 0) return false
  return thisWeekKm > lastWeekKm * 1.1
}

/** Format a date string to locale French display */
export function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

/** Get day of week key (monday, tuesday...) for a date */
export function getDayKey(dateStr: string): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[parseLocalDate(dateStr).getDay()]
}
