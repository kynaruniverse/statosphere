import { getStreakFlame } from '@/lib/cycle'

type Props = {
  icon: string
  name: string
  value: number
  streak?: number
  showStreak?: boolean
}

export default function StatBar({
  icon, name, value, streak = 0, showStreak = true
}: Props) {
  // Cap at 100 to prevent overflow, ensure minimum visibility
  const barWidth = value > 0 ? Math.min(Math.max(value, 2), 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
            {name}
          </span>
          {showStreak && streak > 0 && (
            <span className="text-xs">
              {getStreakFlame(streak)}
              <span className="ml-1 font-mono" style={{ color: '#F59E0B' }}>
                {streak}w
              </span>
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-bold" style={{ color: '#A3E635' }}>
          {value}
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#0F1117' }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: `${barWidth}%`,
            backgroundColor: '#7C3AED',
            minWidth: value > 0 ? '8px' : '0px',
          }}
        />
      </div>
    </div>
  )
}