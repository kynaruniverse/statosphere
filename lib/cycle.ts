// Returns days until Sunday (end of cycle)
export function getDaysUntilCycleEnd(): number {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  return day === 0 ? 0 : 7 - day
}

// Returns the current cycle start (Monday)
export function getCurrentCycleStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Returns ISO week key e.g. "2026-W17" — used as cycle_week in tasks
export function getCycleKey(): string {
  const start = getCurrentCycleStart()
  const year = start.getFullYear()
  // ISO week number
  const jan1 = new Date(year, 0, 1)
  const week = Math.ceil(
    ((start.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  )
  return `${year}-W${String(week).padStart(2, '0')}`
}

// Returns a formatted cycle label e.g. "Week of 22 Apr"
export function getCycleLabel(): string {
  const start = getCurrentCycleStart()
  return `Week of ${start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })}`
}

// Returns urgency color based on days left
export function getCycleUrgencyColor(daysLeft: number): string {
  if (daysLeft <= 1) return '#EF4444'
  if (daysLeft <= 3) return '#F59E0B'
  return '#A3E635'
}

// Returns streak flame emoji based on streak length
export function getStreakFlame(streak: number): string {
  if (streak === 0) return ''
  if (streak < 3) return '🔥'
  if (streak < 6) return '🔥🔥'
  return '🔥🔥🔥'
}

// Determines if a streak should increment
export function shouldIncrementStreak(
  lastCycleDate: string | null,
  currentDate: Date = new Date()
): 'increment' | 'same_week' | 'reset' {
  if (!lastCycleDate) return 'increment'

  const last = new Date(lastCycleDate)

  const getMondayOf = (d: Date) => {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const currentWeekMonday = getMondayOf(currentDate)
  const lastWeekMonday = getMondayOf(last)

  const diffMs = currentWeekMonday.getTime() - lastWeekMonday.getTime()
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))

  if (diffWeeks === 0) return 'same_week'
  if (diffWeeks === 1) return 'increment'
  return 'reset'
}