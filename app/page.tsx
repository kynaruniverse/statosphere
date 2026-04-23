'use client'

/**
 * app/page.tsx — Statosphere Auth Page
 *
 * ⚠️  SUPABASE SETUP REQUIRED:
 *   For password sign-up to work without the "check your email" loop,
 *   go to Supabase Dashboard → Authentication → Email →
 *   disable "Confirm email". Without this, new sign-ups via password
 *   will not create a session on this tab.
 *
 * Auth flows:
 *   Login tab   → email + password (signInWithPassword)
 *                 "Sign in with a code instead" link → OTP flow
 *   Signup tab  → email + password (signUp)
 *   OTP flow    → send code (signInWithOtp) → verify 6-digit code
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'login' | 'signup'
type LoginMode = 'password' | 'otp_email' | 'otp_code'

// ── Style helpers ─────────────────────────────────────────────────────────────

const S = {
  heading: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    color: '#1C1410',
    margin: '0 0 6px',
  } as React.CSSProperties,

  subtext: {
    fontSize: 14,
    color: '#9B8F85',
    margin: '0 0 28px',
    lineHeight: 1.55,
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#6B5E54',
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    marginBottom: 7,
  } as React.CSSProperties,

  input: (hasError: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '13px 16px',
    border: `1.5px solid ${hasError ? '#EF4444' : '#DDD6CE'}`,
    borderRadius: 12,
    fontSize: 15,
    color: '#1C1410',
    background: '#FAF7F3',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }),

  primaryBtn: (disabled: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '14px 20px',
    background: disabled ? '#E8E0D8' : '#7C3AED',
    color: disabled ? '#B0A396' : '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 20,
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
  }),

  ghostBtn: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#9B8F85',
    marginTop: 14,
    fontFamily: 'inherit',
    padding: '4px 0',
    textAlign: 'center' as const,
    transition: 'color 0.15s',
  } as React.CSSProperties,

  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9B8F85',
    fontSize: 13,
    padding: '0 0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: 'inherit',
  } as React.CSSProperties,

  error: {
    fontSize: 13,
    color: '#C0392B',
    margin: '10px 0 0',
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.06)',
    borderRadius: 10,
    border: '1px solid rgba(239,68,68,0.15)',
    lineHeight: 1.4,
  } as React.CSSProperties,

  success: {
    fontSize: 13,
    color: '#15803D',
    margin: '10px 0 0',
    padding: '10px 14px',
    background: 'rgba(22,163,74,0.07)',
    borderRadius: 10,
    border: '1px solid rgba(22,163,74,0.18)',
    lineHeight: 1.4,
  } as React.CSSProperties,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()

  const [ready, setReady]           = useState(false)
  const [tab, setTab]               = useState<Tab>('login')
  const [loginMode, setLoginMode]   = useState<LoginMode>('password')

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [otpEmail, setOtpEmail]     = useState('')
  const [codeInputs, setCodeInputs] = useState(['', '', '', '', '', ''])

  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
      else setReady(true)
    })
  }, [router])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const afterAuth = async (userId: string, defaultRoute: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .single()
    router.replace(profile?.onboarding_complete ? '/dashboard' : '/onboarding')
  }

  const resetForm = () => {
    setError('')
    setSuccessMsg('')
    setPassword('')
  }

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setLoginMode('password')
    resetForm()
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : signInError.message
      )
      setLoading(false)
      return
    }

    if (data.user) await afterAuth(data.user.id, '/dashboard')
  }

  // ── Sign up ──────────────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!email.trim() || !password) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    setSuccessMsg('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation is OFF — signed in immediately ✓
      await afterAuth(data.session.user.id, '/onboarding')
    } else {
      // Email confirmation is ON — session won't be set here
      setSuccessMsg(
        'Check your inbox for a confirmation link. Once confirmed, ' +
        'come back and sign in with your password.'
      )
      setLoading(false)
    }
  }

  // ── OTP: send code ───────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!otpEmail.trim()) return
    setLoading(true)
    setError('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: otpEmail.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setLoginMode('otp_code')
  }

  // ── OTP: verify code ─────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const fullCode = codeInputs.join('')
    if (fullCode.length !== 6) return
    setLoading(true)
    setError('')

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: otpEmail.trim().toLowerCase(),
      token: fullCode,
      type: 'email',
    })

    if (verifyError) {
      setError('Incorrect code. Please try again.')
      setLoading(false)
      return
    }

    if (data.user) await afterAuth(data.user.id, '/dashboard')
  }

  // ── OTP code input handlers ──────────────────────────────────────────────────
  const handleCodeInput = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...codeInputs]
    next[index] = digit
    setCodeInputs(next)
    setError('')

    if (digit && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
    if (next.every(d => d !== '') && digit) {
      setTimeout(() => document.getElementById('verify-btn')?.click(), 80)
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = ['', '', '', '', '', '']
    pasted.split('').forEach((d, i) => { next[i] = d })
    setCodeInputs(next)
    if (pasted.length === 6) {
      setTimeout(() => document.getElementById('verify-btn')?.click(), 80)
    }
  }

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <main style={{
        minHeight: '100svh',
        background: '#EEE8DE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '2px solid #D8D0C7',
          borderTopColor: '#7C3AED',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: '100svh',
      background: '#EEE8DE',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif",
    }}>

      {/* ── Ambient blobs ── */}
      <div style={{
        position: 'fixed', top: -120, right: -100, width: 360, height: 360,
        borderRadius: '50%', background: 'rgba(124,58,237,0.07)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: -80, left: -80, width: 280, height: 280,
        borderRadius: '50%', background: 'rgba(163,230,53,0.09)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', top: '55%', left: -40, width: 120, height: 120,
        borderRadius: '50%', background: 'rgba(124,58,237,0.04)',
        pointerEvents: 'none',
      }} />

      {/* ══════════════════════════════════════════════════════════════
          CARD
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        width: '100%',
        maxWidth: 396,
        background: '#FFFFFF',
        borderRadius: 24,
        padding: '32px 28px 36px',
        boxShadow: '0 2px 48px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── Logo mark ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED 0%, #65A30D 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            S
          </div>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#1C1410',
          }}>
            Statosphere
          </span>
        </div>

        {/* ══════════════════════════════
            OTP: ENTER EMAIL
        ══════════════════════════════ */}
        {loginMode === 'otp_email' && (
          <div>
            <button
              onClick={() => { setLoginMode('password'); setError('') }}
              style={S.backBtn}>
              ← Back
            </button>
            <h2 style={S.heading}>
              Sign in with a<br />
              <span style={{ color: '#7C3AED' }}>code.</span>
            </h2>
            <p style={S.subtext}>
              We'll send a 6-digit code — no new tabs, no magic links.
            </p>

            <label style={S.label}>Email</label>
            <input
              type="email"
              value={otpEmail}
              autoFocus
              autoComplete="email"
              onChange={e => { setOtpEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
              onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : '#DDD6CE' }}
              placeholder="you@example.com"
              style={S.input(!!error)}
            />

            {error && <p style={S.error}>{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={!otpEmail.trim() || loading}
              style={S.primaryBtn(!otpEmail.trim() || loading)}>
              {loading ? 'Sending...' : 'Send code →'}
            </button>
          </div>
        )}

        {/* ══════════════════════════════
            OTP: ENTER CODE
        ══════════════════════════════ */}
        {loginMode === 'otp_code' && (
          <div>
            <button
              onClick={() => {
                setLoginMode('otp_email')
                setCodeInputs(['', '', '', '', '', ''])
                setError('')
              }}
              style={S.backBtn}>
              ← Back
            </button>
            <h2 style={S.heading}>
              Enter your<br />
              <span style={{ color: '#7C3AED' }}>6-digit code.</span>
            </h2>
            <p style={S.subtext}>Sent to {otpEmail}</p>

            {/* Code boxes */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
              {codeInputs.map((val, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  autoFocus={i === 0}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  onPaste={i === 0 ? handleCodePaste : undefined}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : '#DDD6CE' }}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    padding: '12px 0',
                    border: `1.5px solid ${error ? '#EF4444' : '#DDD6CE'}`,
                    borderRadius: 12,
                    outline: 'none',
                    color: '#1C1410',
                    background: '#FAF7F3',
                    fontFamily: 'monospace',
                    transition: 'border-color 0.15s',
                  }}
                />
              ))}
            </div>

            {error && <p style={S.error}>{error}</p>}

            <button
              id="verify-btn"
              onClick={handleVerifyOtp}
              disabled={codeInputs.join('').length < 6 || loading}
              style={S.primaryBtn(codeInputs.join('').length < 6 || loading)}>
              {loading ? 'Verifying...' : 'Sign in →'}
            </button>

            <button
              onClick={() => {
                setCodeInputs(['', '', '', '', '', ''])
                handleSendOtp()
              }}
              style={S.ghostBtn}
              onMouseEnter={e => { e.currentTarget.style.color = '#6B5E54' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9B8F85' }}>
              Resend code
            </button>
          </div>
        )}

        {/* ══════════════════════════════
            PASSWORD FLOW (Login + Signup)
        ══════════════════════════════ */}
        {loginMode === 'password' && (
          <>
            {/* Tab switcher */}
            <div style={{
              display: 'flex',
              borderBottom: '1.5px solid #EDE8E0',
              marginBottom: 28,
            }}>
              {(['login', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: tab === t ? 700 : 500,
                    color: tab === t ? '#1C1410' : '#A89A90',
                    borderBottom: tab === t
                      ? '2.5px solid #7C3AED'
                      : '2.5px solid transparent',
                    marginBottom: -1.5,
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}>
                  {t === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {/* ── LOGIN TAB ── */}
            {tab === 'login' && (
              <>
                <label style={S.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  autoFocus
                  autoComplete="email"
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('login-pw')?.focus()}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#DDD6CE' }}
                  placeholder="you@example.com"
                  style={{ ...S.input(false), marginBottom: 18 }}
                />

                <label style={S.label}>Password</label>
                <input
                  id="login-pw"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : '#DDD6CE' }}
                  placeholder="••••••••"
                  style={S.input(!!error)}
                />

                {error && <p style={S.error}>{error}</p>}

                <button
                  onClick={handleLogin}
                  disabled={!email.trim() || !password || loading}
                  style={S.primaryBtn(!email.trim() || !password || loading)}>
                  {loading ? 'Signing in...' : 'Sign in →'}
                </button>

                <button
                  onClick={() => {
                    // Pre-fill OTP email from whatever they typed
                    setOtpEmail(email)
                    setLoginMode('otp_email')
                    setError('')
                  }}
                  style={S.ghostBtn}
                  onMouseEnter={e => { e.currentTarget.style.color = '#6B5E54' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#9B8F85' }}>
                  Sign in with a code instead
                </button>
              </>
            )}

            {/* ── SIGNUP TAB ── */}
            {tab === 'signup' && (
              <>
                <label style={S.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  autoFocus
                  autoComplete="email"
                  onChange={e => { setEmail(e.target.value); setError(''); setSuccessMsg('') }}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('signup-pw')?.focus()}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#DDD6CE' }}
                  placeholder="you@example.com"
                  style={{ ...S.input(false), marginBottom: 18 }}
                />

                <label style={S.label}>Password</label>
                <input
                  id="signup-pw"
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={e => { e.currentTarget.style.borderColor = error ? '#EF4444' : '#DDD6CE' }}
                  placeholder="At least 6 characters"
                  style={S.input(!!error)}
                />

                {error && <p style={S.error}>{error}</p>}
                {successMsg && <p style={S.success}>{successMsg}</p>}

                <button
                  onClick={handleSignup}
                  disabled={!email.trim() || !password || loading}
                  style={S.primaryBtn(!email.trim() || !password || loading)}>
                  {loading ? 'Creating account...' : 'Create account →'}
                </button>

                <p style={{
                  fontSize: 11,
                  color: '#B5A99F',
                  textAlign: 'center',
                  margin: '16px 0 0',
                  lineHeight: 1.5,
                }}>
                  Your build, held accountable by people who actually know you.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Stat pills ── */}
      <div style={{
        display: 'flex',
        gap: 7,
        marginTop: 22,
        flexWrap: 'wrap',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {['💪 Strength', '⚔️ Discipline', '✨ Charisma', '🧠 Intelligence'].map(s => (
          <span key={s} style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 11px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.55)',
            color: '#A89A90',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* ── Font import + global resets ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #FAF7F3 inset !important;
          -webkit-text-fill-color: #1C1410 !important;
        }
      `}</style>
    </main>
  )
}
