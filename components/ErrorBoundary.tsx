'use client'
import { Component, type ReactNode } from 'react'

const VR = {
  bg: '#EBF0E5', card: '#FFFFFF', border: '#C4D0B8',
  text: '#161D14', muted: '#627056', accent: '#2D6A3F',
  rejected: '#A0302A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production you'd send this to Sentry / LogFlare etc.
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight: '100svh', background: VR.bg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px', fontFamily: VR.body,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 36, marginBottom: 16 }}>🌿</p>

          <p style={{
            fontSize: 18, fontWeight: 700,
            fontFamily: VR.display, color: VR.text,
            letterSpacing: '0.02em', marginBottom: 8,
          }}>
            Something went wrong.
          </p>

          <p style={{
            fontSize: 13, color: VR.muted,
            fontStyle: 'italic', lineHeight: 1.6,
            maxWidth: 280, marginBottom: 24,
          }}>
            An unexpected error interrupted your build. The forge will recover.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.message && (
            <pre style={{
              fontSize: 11, color: VR.rejected,
              background: '#F5DADA', border: '1px solid #E0B0B0',
              borderRadius: 8, padding: '10px 14px',
              maxWidth: 340, overflowX: 'auto',
              textAlign: 'left', marginBottom: 24, lineHeight: 1.5,
            }}>
              {this.state.message}
            </pre>
          )}

          <button
            onClick={() => {
              this.setState({ hasError: false, message: '' })
              window.location.reload()
            }}
            style={{
              padding: '12px 24px',
              background: VR.accent, color: '#FFFFFF',
              border: 'none', borderRadius: 10,
              fontSize: 12, fontWeight: 700,
              fontFamily: VR.display, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
