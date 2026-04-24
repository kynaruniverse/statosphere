type Props = {
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  icon?: string
}

export default function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div style={{
      padding: '36px 24px',
      borderRadius: 12,
      border: '1.5px dashed var(--vr-border)',
      textAlign: 'center',
      background: 'rgba(255,255,255,0.4)',
    }}>
      {icon && (
        <p style={{ fontSize: 32, marginBottom: 12, lineHeight: 1 }}>
          {icon}
        </p>
      )}

      <p style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.04em',
        color: 'var(--vr-text)',
        marginBottom: 8,
      }}>
        {title}
      </p>

      <p style={{
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--vr-muted)',
        maxWidth: 280,
        margin: '0 auto',
        fontStyle: 'italic',
      }}>
        {description}
      </p>

      {action && (
        <div style={{ marginTop: 20 }}>
          {action.href ? (
            <a
              href={action.href}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'var(--vr-accent)',
                color: '#FFFFFF',
                borderRadius: 8,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              style={{
                padding: '10px 20px',
                background: 'var(--vr-accent)',
                color: '#FFFFFF',
                borderRadius: 8,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
