import Link from 'next/link'

type Props = {
  title: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
}

export default function PageHeader({
  title, backHref, backLabel = '← Back', action,
}: Props) {
  return (
    <div>
      {/* Eyebrow */}
      <p style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: 'var(--vr-accent)',
        fontFamily: 'var(--font-display)',
        marginBottom: 6,
      }}>
        Statosphere
      </p>

      {/* Title + action row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 16,
        borderBottom: '1px solid var(--vr-border)',
        marginBottom: 28,
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--vr-text)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          margin: 0,
        }}>
          {title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {action}
          {backHref && (
            <Link
              href={backHref}
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
                padding: '6px 12px',
                border: '1px solid var(--vr-border)',
                borderRadius: 6,
                color: 'var(--vr-muted)',
                textDecoration: 'none',
                background: 'var(--vr-card)',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
