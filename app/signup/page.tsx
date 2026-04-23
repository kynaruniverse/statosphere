'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async () => {
    if (!email || !fullName) return
    setLoading(true)
    setError('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="text-center space-y-4 max-w-md">
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#7C3AED' }}>
          CHECK YOUR EMAIL
        </p>
        <h1 className="text-3xl font-black" style={{ color: '#F1F5F9' }}>
          Your build starts now.
        </h1>
        <p style={{ color: '#64748B' }}>
          Open the link we sent to<br />
          <span style={{ color: '#F1F5F9' }}>{email}</span>
        </p>
        <p className="text-xs" style={{ color: '#64748B' }}>
          No email? Check your spam folder.
        </p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md w-full space-y-6">

        <div className="space-y-2">
          <p className="text-xs tracking-[0.3em] uppercase"
            style={{ color: '#7C3AED' }}>
            STATOSPHERE
          </p>
          <h1 className="text-3xl font-black" style={{ color: '#F1F5F9' }}>
            Begin your build.
          </h1>
          <p style={{ color: '#64748B' }}>
            No password needed. We'll send you a magic link.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#64748B' }}>
              Your name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              placeholder="Your name"
              autoComplete="name"
              className="w-full px-4 py-4 rounded-2xl border outline-none"
              style={{
                backgroundColor: '#1B1F3B',
                borderColor: '#2D3158',
                color: '#F1F5F9',
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#64748B' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-4 rounded-2xl border outline-none"
              style={{
                backgroundColor: '#1B1F3B',
                borderColor: '#2D3158',
                color: '#F1F5F9',
              }}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm p-3 rounded-xl"
            style={{ color: '#EF4444', backgroundColor: '#1B1F3B' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSignup}
          disabled={loading || !email || !fullName}
          className="w-full py-4 rounded-2xl font-bold disabled:opacity-50
            transition-all active:scale-95"
          style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
          {loading ? 'Sending...' : 'Continue →'}
        </button>

        <p className="text-center text-sm" style={{ color: '#64748B' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#A3E635' }}>
            Sign in
          </Link>
        </p>

      </div>
    </main>
  )
}