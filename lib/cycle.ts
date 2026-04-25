/**
 * lib/cycle.ts
 *
 * Statosphere uses ISO 8601 weekly cycles: Monday 00:00 → Sunday 23:59 (local time).
 * Cycle key format: "YYYY-WNN"  e.g. "2026-W17"
 *
 * Functions exported:
 *   getCurrentCycleWeek()      → "2026-W17"
 *   getDaysUntilCycleEnd()     → 0-6  (0 = today is Sunday)
 *   getCycleLabel()            → "Week 17 · Apr 21 – Apr 27"
 *   getCycleUrgencyColor()     → CSS colour string
 *   getStreakFlame(n)          → emoji string for streak display
 */

// ── ISO week helpers ──────────────────────────────────────────────────────────

/** Returns the ISO week number (1-53) for a given Date */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Returns the ISO week year (may differ from calendar year at year boundaries) */
function isoWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return d.getUTCFullYear()
}

/** Returns the Monday of the ISO week containing `date` */
function isoWeekMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() || 7    // Make Sunday = 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns the Sunday (end) of the ISO week containing `date` */
function isoWeekSunday(date: Date): Date {
  const monday = isoWeekMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the current ISO cycle key as "YYYY-WNN"
 * e.g. "2026-W17"
 */
export function getCurrentCycleWeek(): string {
  const now   = new Date()
  const year  = isoWeekYear(now)
  const week  = isoWeekNumber(now)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/**
 * Returns number of days until the end of the current ISO week.
 * Sunday = 0, Saturday = 1, ... Monday = 6
 */
export function getDaysUntilCycleEnd(): number {
  const now    = new Date()
  const sunday = isoWeekSunday(now)
  const diffMs = sunday.getTime() - now.getTime()
  // Round down to whole days; clamp to 0
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Returns a human-readable label for the current cycle.
 * e.g. "Week 17 · Apr 21 – Apr 27"
 */
export function getCycleLabel(): string {
  const now    = new Date()
  const week   = isoWeekNumber(now)
  const monday = isoWeekMonday(now)
  const sunday = isoWeekSunday(now)

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return `Week ${week} · ${fmt(monday)} – ${fmt(sunday)}`
}

/**
 * Returns a Verdant Ruin colour for the urgency indicator.
 * 0-1 days → red, 2-3 → amber, 4+ → gold
 */
export function getCycleUrgencyColor(daysLeft: number): string {
  if (daysLeft <= 1) return '#A0302A'   // deep red
  if (daysLeft <= 3) return '#7A6020'   // amber
  return '#6B8C3A'                       // gold — VR.gold
}

/**
 * Returns a flame emoji string scaled to streak length.
 * 0 → ''   1-2 → '🔥'   3-5 → '🔥🔥'   6+ → '🔥🔥🔥'
 */
export function getStreakFlame(streak: number): string {
  if (streak <= 0) return ''
  if (streak <= 2) return '🔥'
  if (streak <= 5) return '🔥🔥'
  return '🔥🔥🔥'
}

/**
 * Parses a cycle key "YYYY-WNN" into a label.
 * e.g. "2026-W17" → "Week 17, 2026"
 */
export function parseCycleWeekLabel(cycleWeek: string | null): string {
  if (!cycleWeek) return ''
  const match = cycleWeek.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return cycleWeek
  return `Week ${parseInt(match[2], 10)}, ${match[1]}`
}
