'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import StatBar from '@/components/StatBar'
import Link from 'next/link'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  rejected: '#A0302A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
  mono: "'JetBrains Mono','Courier New',monospace",
}

type PublicProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  location: string | null
  becoming_statement: string | null
  profile_public: boolean
  council_requests_open: boolean
  created_at: string
}

type UserStat = {
  id: string
  stat_category_id: string
  current_value: number
  stat_categories: { name: string; icon: string } | null
}

export default function PublicProfilePage() {
  const params   = useParams()
  const username = params.username as string

  const [profile, setProfile]   = useState<PublicProfile | null>(null)
  const [stats, setStats]       = useState<UserStat[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [isOwner, setIsOwner]   = useState(false)

  const [showReqForm, setShowReqForm] = useState(false)
  const [reqMessage, setReqMessage]   = useState('')
  const [requesting, setRequesting]   = useState(false)
  const [reqSent, setReqSent]         = useState(false)
  const [reqError, setReqError]       = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setViewerId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single()

      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)
      if (user && user.id === profileData.id) setIsOwner(true)

      if (!profileData.profile_public && user?.id !== profileData.id) {
        setLoading(false); return
      }

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*, stat_categories(name, icon)')
        .eq('user_id', profileData.id)

      if (statsData) setStats(statsData as UserStat[])
      setLoading(false)
    }
    load()
  }, [username])

  const handleRequestSeat = async () => {
    if (!viewerId || !profile) return
    setRequesting(true); setReqError('')

    // ── Schema-correct insert ──────────────────────────────────────────────────
    // council_requests uses: requester_id, target_user_id
    const { error } = await supabase.from('council_requests').insert({
      requester_id:   viewerId,                // ← correct column
      target_user_id: profile.id,             // ← correct column (not council_id)
      message:        reqMessage.trim() || null,
      status:         'pending',
    })

    if (error) {
      setReqError(
        error.code === '23505'
          ? 'You already requested a seat.'
          : 'Failed to send request. Please try again.'
      )
    } else {
      setReqSent(true)
    }
    setRequesting(false)
  }

  const totalXP = stats.reduce((s, x) => s + x.current_value, 0)
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  if (loading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  if (notFound) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: VR.body, padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: 36 }}>🌿</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.display, color: VR.text }}>Build not found</p>
      <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic' }}>That path leads nowhere.</p>
      <Link href="/" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, fontFamily: VR.display, color: VR.accent, textDecoration: 'none', letterSpacing: '0.08em' }}>← Return</Link>
    </main>
  )

  if (!profile?.profile_public && !isOwner) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: VR.body, padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: 36 }}>🔒</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.display, color: VR.text }}>Private build</p>
      <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic' }}>This person keeps their build private.</p>
      <Link href="/" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, fontFamily: VR.display, color: VR.accent, textDecoration: 'none', letterSpacing: '0.08em' }}>← Return</Link>
    </main>
  )

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 80px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 24px)' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, margin: 0 }}>Statosphere</p>
          <Link href={isOwner ? '/dashboard' : '/'} style={{ fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.08em', padding: '5px 12px', border: `1px solid ${VR.border}`, borderRadius: 6, color: VR.muted, textDecoration: 'none', background: VR.card }}>
            {isOwner ? '← Dashboard' : '← Home'}
          </Link>
        </div>

        {/* Character sheet header */}
        <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(22,29,20,0.07)' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, marginBottom: 5 }}>Character Build</p>
                <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: VR.display, color: VR.text, letterSpacing: '0.02em', lineHeight: 1.1, margin: 0 }}>@{profile?.username}</h1>
                {profile?.full_name && <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', marginTop: 3 }}>{profile.full_name}</p>}
                {profile?.location && <p style={{ fontSize: 11, color: VR.muted, marginTop: 4 }}>📍 {profile.location}</p>}
              </div>
              <div style={{ background: VR.surface, border: `1px solid ${VR.border}`, borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 64 }}>
                <p style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.mono, color: VR.accent, lineHeight: 1, margin: 0 }}>{totalXP}</p>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginTop: 3 }}>Total XP</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic', marginBottom: 14 }}>Member since {formatDate(profile?.created_at || '')}</p>
          </div>

          {profile?.bio && (
            <div style={{ padding: '12px 20px', background: VR.surface, borderTop: `1px solid ${VR.border}` }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: VR.text, fontStyle: 'italic', margin: 0 }}>{profile.bio}</p>
            </div>
          )}

          {profile?.becoming_statement && (
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${VR.border}` }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 6 }}>Becoming</p>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: VR.text, fontStyle: 'italic', margin: 0 }}>"{profile.becoming_statement}"</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 12px rgba(22,29,20,0.06)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 18 }}>Build Stats</p>
          {stats.length === 0 ? (
            <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>No stats recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {stats.map((stat, i) => (
                <div key={stat.id}>
                  {i > 0 && <div style={{ height: 1, background: VR.surface, marginBottom: 18 }} />}
                  <StatBar icon={stat.stat_categories?.icon || ''} name={stat.stat_categories?.name || ''} value={stat.current_value} showStreak={false} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Council request */}
        {!isOwner && viewerId && profile?.council_requests_open && (
          <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(22,29,20,0.06)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 4 }}>Council</p>
            <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', marginBottom: 14 }}>This person's council is open. Request a seat to help hold them accountable.</p>

            {reqSent ? (
              <div style={{ padding: '14px', background: VR.accentMuted, border: `1px solid ${VR.accent}30`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontFamily: VR.display, color: VR.accent }}>✓ Request sent</p>
                <p style={{ fontSize: 12, color: VR.muted, fontStyle: 'italic', marginTop: 4 }}>They'll be notified to review your request.</p>
              </div>
            ) : showReqForm ? (
              <div>
                <textarea value={reqMessage} onChange={e => setReqMessage(e.target.value)} placeholder="Introduce yourself — why do you want a seat? (optional)" rows={3} style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${VR.border}`, borderRadius: 10, fontSize: 13, color: VR.text, background: VR.surface, outline: 'none', resize: 'none', lineHeight: 1.6, fontFamily: VR.body, marginBottom: 10, boxSizing: 'border-box' }} onFocus={e => { e.currentTarget.style.borderColor = VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = VR.border }} />
                {reqError && <p style={{ fontSize: 12, color: VR.rejected, marginBottom: 10 }}>{reqError}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => setShowReqForm(false)} style={{ padding: '11px', background: VR.surface, color: VR.muted, border: `1px solid ${VR.border}`, borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleRequestSeat} disabled={requesting} style={{ padding: '11px', background: VR.accent, color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: requesting ? 'not-allowed' : 'pointer', opacity: requesting ? 0.6 : 1 }}>{requesting ? 'Sending...' : 'Send Request →'}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReqForm(true)} style={{ width: '100%', padding: '13px 20px', background: VR.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 2px 10px ${VR.accent}30` }}>
                Request a Council Seat →
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <Link href="/settings" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, textDecoration: 'none' }}>
            Edit your profile →
          </Link>
        )}
      </div>
    </main>
  )
}
