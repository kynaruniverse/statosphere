'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  rejected: '#A0302A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

type InviteData = {
  id: string
  email: string
  council_id: string
  status: string
  councils: {
    id: string
    owner_id: string
    profiles: { full_name: string | null; username: string | null } | null
  } | null
}

function JoinPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token')

  const [invite, setInvite]     = useState<InviteData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [invalid, setInvalid]   = useState(false)
  const [joining, setJoining]   = useState(false)
  const [joined, setJoined]     = useState(false)
  const [error, setError]       = useState('')
  const [userId, setUserId]     = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!token) { setInvalid(true); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data: inviteData, error: invErr } = await supabase
        .from('council_invites')
        .select('*, councils(id, owner_id, profiles:owner_id(full_name, username))')
        .eq('token', token)
        .single()

      if (invErr || !inviteData) { setInvalid(true); setLoading(false); return }
      if (inviteData.status !== 'pending') { setInvalid(true); setLoading(false); return }

      setInvite(inviteData as InviteData)
      setLoading(false)
    }
    load()
  }, [token])

  const handleAccept = async () => {
    if (!invite || !userId) return
    setJoining(true); setError('')

    // Add as active council member
    const { error: insertErr } = await supabase.from('council_members').insert({
      council_id: invite.council_id,
      member_id: userId,
      status: 'active',
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        setError("You're already on this council.")
      } else {
        setError('Something went wrong. Please try again.')
      }
      setJoining(false); return
    }

    // Mark invite used
    await supabase.from('council_invites').update({ status: 'accepted' }).eq('id', invite.id)
    await supabase.from('council_members').update({ status: 'active' }).eq('council_id', invite.council_id).eq('invite_email', invite.email)

    setJoined(true)
    setTimeout(() => router.push('/dashboard'), 2200)
  }

  const ownerName = invite?.councils?.profiles?.full_name
    || (invite?.councils?.profiles?.username ? `@${invite.councils.profiles.username}` : 'someone')

  if (loading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  if (invalid) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: VR.body, padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: 36 }}>🌿</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.display, color: VR.text }}>Invite not found</p>
      <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', maxWidth: 280 }}>
        This invite link may have already been used or has expired.
      </p>
      <Link href="/" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, fontFamily: VR.display, color: VR.accent, textDecoration: 'none', letterSpacing: '0.08em' }}>← Return home</Link>
    </main>
  )

  if (joined) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: VR.body, padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: 36 }}>🛡️</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.display, color: VR.text }}>Seat accepted</p>
      <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic' }}>Taking you to your dashboard...</p>
    </main>
  )

  return (
    <main style={{
      minHeight: '100svh', background: VR.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: VR.body,
    }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(45,106,63,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(107,140,58,0.07)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 390,
        background: VR.card,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 4px 40px rgba(22,29,20,0.1)',
        border: `1px solid ${VR.border}`,
        position: 'relative', zIndex: 1,
      }}>

        {/* Green header band */}
        <div style={{
          padding: '24px 24px 20px',
          background: `linear-gradient(135deg, ${VR.accent} 0%, ${VR.gold} 100%)`,
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', fontFamily: VR.display, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
            Council Invitation
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: VR.display, color: '#FFFFFF', letterSpacing: '0.02em', lineHeight: 1.2, margin: 0 }}>
            You've been invited to join {ownerName}'s Council.
          </h1>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px 28px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: VR.muted, fontStyle: 'italic', marginBottom: 22 }}>
            As a Council member, you'll review their weekly submissions, hold them accountable, and vote on whether they've earned their XP.
          </p>

          {/* What this means list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              ['⚖️', 'Vote on their task submissions each week'],
              ['💬', 'Leave feedback on their progress'],
              ['🛡️', 'Help them grow — for real'],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ fontSize: 13, color: VR.text, lineHeight: 1.5 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Not logged in warning */}
          {!userId && (
            <div style={{ padding: '12px 14px', background: VR.surface, border: `1px solid ${VR.border}`, borderRadius: 10, marginBottom: 18 }}>
              <p style={{ fontSize: 12, color: VR.muted, lineHeight: 1.5 }}>
                You need a Statosphere account to accept this invitation.{' '}
                <Link href={`/?invite=${token}`} style={{ color: VR.accent, fontWeight: 700, textDecoration: 'none' }}>
                  Sign in or create one →
                </Link>
              </p>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: VR.rejected, marginBottom: 14, padding: '10px 14px', background: '#F5DADA', borderRadius: 8, border: `1px solid ${VR.rejected}30` }}>
              {error}
            </p>
          )}

          <button
            onClick={handleAccept}
            disabled={!userId || joining}
            style={{
              width: '100%', padding: '14px 20px',
              background: (!userId || joining) ? VR.surface : VR.accent,
              color: (!userId || joining) ? VR.muted : '#FFFFFF',
              border: 'none', borderRadius: 12,
              fontSize: 12, fontWeight: 700, fontFamily: VR.display,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: (!userId || joining) ? 'not-allowed' : 'pointer',
              boxShadow: (!userId || joining) ? 'none' : `0 2px 12px ${VR.accent}30`,
              transition: 'all 0.15s',
            }}>
            {joining ? 'Joining...' : 'Accept Seat →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: VR.muted, marginTop: 14, fontStyle: 'italic' }}>
            You can step down from the Council at any time.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function JoinPageWrapper() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100svh', background: '#EBF0E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #C4D0B8', borderTopColor: '#2D6A3F', animation: 'spin .85s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    }>
      <JoinPage />
    </Suspense>
  )
}