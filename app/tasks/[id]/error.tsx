'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main style={{
      minHeight: '100svh', background: '#EBF0E5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, fontFamily: "'Spectral','Georgia',serif",
      textAlign: 'center', padding: '24px',
    }}>
      <p style={{ fontSize: 36 }}>🌿</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cinzel',serif", color: '#161D14' }}>
        Something went wrong.
      </p>
      <p style={{ fontSize: 13, color: '#627056', fontStyle: 'italic' }}>
        An unexpected error interrupted your build.
      </p>
      <button onClick={reset} style={{
        marginTop: 8, padding: '12px 24px',
        background: '#2D6A3F', color: '#FFFFFF',
        border: 'none', borderRadius: 10,
        fontSize: 12, fontWeight: 700,
        fontFamily: "'Cinzel',serif", letterSpacing: '0.1em',
        textTransform: 'uppercase', cursor: 'pointer',
      }}>
        Try again
      </button>
    </main>
  )
}