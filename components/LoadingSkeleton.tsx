type Props = {
  lines?: number
  className?: string
}

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--vr-surface) 25%, var(--vr-border) 50%, var(--vr-surface) 75%)',
  backgroundSize: '200% 100%',
  animation: 'vrShimmer 1.4s ease-in-out infinite',
  borderRadius: 6,
}

export function SkeletonLine({ width = 'full', height = 4 }: {
  width?: string | number
  height?: number
}) {
  return (
    <div
      style={{
        ...shimmer,
        height: `${height * 4}px`,
        width: width === 'full' ? '100%' : typeof width === 'number' ? `${width}px` : width,
      }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div style={{
      padding: 20,
      borderRadius: 12,
      border: '1px solid var(--vr-border)',
      background: 'var(--vr-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <SkeletonLine width="33%" height={3} />
      <SkeletonLine width="full" height={4} />
      <SkeletonLine width="80%" height={3} />
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ ...shimmer, width: 24, height: 24, borderRadius: 6 }} />
          <div style={{ ...shimmer, width: 72, height: 12 }} />
        </div>
        <div style={{ ...shimmer, width: 28, height: 12 }} />
      </div>
      <div style={{ ...shimmer, width: '100%', height: 6, borderRadius: 3 }} />
    </div>
  )
}

export default function LoadingSkeleton({ lines = 3 }: Props) {
  return (
    <main style={{
      minHeight: '100svh',
      background: 'var(--vr-bg)',
      padding: '48px 24px',
    }}>
      <style>{`
        @keyframes vrShimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
      <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonLine width="25%" height={3} />
          <SkeletonLine width="50%" height={6} />
        </div>
        <SkeletonCard />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    </main>
  )
}
