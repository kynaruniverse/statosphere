import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100svh',
      background: '#EBF0E5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'Spectral','Georgia',serif",
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Ambient */}
      <div style={{ position: 'fixed', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(45,106,63,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(107,140,58,0.07)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Runic 404 */}
        <p style={{
          fontSize: 80,
          fontWeight: 900,
          fontFamily: "'Cinzel','Times New Roman',serif",
          color: '#C4D0B8',
          letterSpacing: '0.05em',
          lineHeight: 1,
          marginBottom: 4,
          userSelect: 'none',
        }}>
          404
        </p>

        <p style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          fontFamily: "'Cinzel','Times New Roman',serif",
          color: '#2D6A3F',
          marginBottom: 20,
        }}>
          Path Unknown
        </p>

        <p style={{
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "'Cinzel','Times New Roman',serif",
          color: '#161D14',
          letterSpacing: '0.02em',
          marginBottom: 8,
        }}>
          This road leads nowhere.
        </p>

        <p style={{
          fontSize: 13,
          color: '#627056',
          fontStyle: 'italic',
          lineHeight: 1.65,
          maxWidth: 260,
          margin: '0 auto 28px',
        }}>
          The page you're looking for has been lost to the overgrowth.
        </p>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: 200, margin: '0 auto 28px',
        }}>
          <div style={{ flex: 1, height: 1, background: '#C4D0B8' }} />
          <span style={{ fontSize: 10, color: '#A8BCA0' }}>✦</span>
          <div style={{ flex: 1, height: 1, background: '#C4D0B8' }} />
        </div>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#2D6A3F',
            color: '#FFFFFF',
            borderRadius: 10,
            fontFamily: "'Cinzel','Times New Roman',serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            boxShadow: '0 2px 12px rgba(45,106,63,0.25)',
          }}
        >
          Return to your build →
        </Link>
      </div>
    </main>
  )
}
