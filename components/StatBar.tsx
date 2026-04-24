import { getStreakFlame } from '@/lib/cycle'

type Props = {
  icon: string
  name: string
  value: number
  streak?: number
  showStreak?: boolean
  animate?: boolean
}

export default function StatBar({
  icon, name, value, streak = 0, showStreak = true, animate = true,
}: Props) {
  const barWidth = value > 0 ? Math.min(Math.max(value, 2), 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--vr-muted)',
            fontFamily: 'var(--font-display)',
          }}>
            {name}
          </span>
          {showStreak && streak > 0 && (
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: '#8B6914',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              {getStreakFlame(streak)}
              <span>{streak}w</span>
            </span>
          )}
        </div>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--vr-accent)',
          letterSpacing: '0.05em',
        }}>
          {value}
        </span>
      </div>

      {/* Gauge track */}
      <div style={{
        width: '100%',
        height: 6,
        background: 'var(--vr-stat-bg)',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid var(--vr-border)',
        position: 'relative',
      }}>
        {/* Notch marks — subtle Souls-like gauge markers */}
        {[25, 50, 75].map(pct => (
          <div key={pct} style={{
            position: 'absolute',
            left: `${pct}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'rgba(196, 208, 184, 0.8)',
            zIndex: 2,
          }} />
        ))}

        {/* Fill */}
        <div style={{
          height: '100%',
          width: `${barWidth}%`,
          background: `linear-gradient(90deg, var(--vr-accent) 0%, var(--vr-gold) 100%)`,
          borderRadius: 3,
          minWidth: value > 0 ? 6 : 0,
          transition: animate ? 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Sheen overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: 'rgba(255,255,255,0.25)',
            borderRadius: '3px 3px 0 0',
          }} />
        </div>
      </div>

    </div>
  )
}
