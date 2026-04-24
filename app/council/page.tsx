'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { CouncilMember } from '@/lib/types'
import Link from 'next/link'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  approved: '#2D6A3F', rejected: '#A0302A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
  mono: "'JetBrains Mono','Courier New',monospace",
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%',
  padding: '13px 16px',
  border: `1.5px solid ${VR.border}`,
  borderRadius: 10, fontSize: 14,
  color: VR.text, background: VR.card,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: VR.body,
  transition: 'border-color 0.15s',
}

export default function CouncilPage() {
  const router = useRouter()
  const [members, setMembers]       = useState<CouncilMember[]>([])
  const [councilId, setCouncilId]   = useState<string | null>(null)
  const [email, setEmail]           = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')
  const [errorMsg, setErrorMsg]     = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: council } = await supabase.from('councils').select('id').eq('owner_id', user.id).single()
      if (!council) { setPageLoading(false); return }
      setCouncilId(council.id)

      const { data: membersData } = await supabase
        .from('council_members').select('*, profiles(*)')
        .eq('council_id', council.id).order('invited_at', { ascending: false })
      if (membersData) setMembers(membersData)
      setPageLoading(false)
    }
    load()
  }, [router])

  const handleInvite = async () => {
    if (!email || !councilId) return
    setInviteStatus('sending'); setErrorMsg('')

    const res  = await fetch('/api/invite-council', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const data = await res.json()

    if (data.success) {
      setInviteStatus('sent'); setEmail('')
      const { data: membersData } = await supabase.from('council_members').select('*, profiles(*)').eq('council_id', councilId).order('invited_at', { ascending: false })
      if (membersData) setMembers(membersData)
      setTimeout(() => setInviteStatus('idle'), 3000)
    } else {
      setErrorMsg(data.error || 'Failed to send invite'); setInviteStatus('error')
    }
  }

  const statusColor = (s: string) => s === 'active' ? VR.approved : s === 'pending' ? VR.gold : VR.muted
  const statusBg    = (s: string) => s === 'active' ? VR.accentMuted : s === 'pending' ? '#E8F0D4' : VR.surface
  const statusLabel = (s: string) => s === 'active' ? 'Active' : s === 'pending' ? 'Invite sent' : s

  if (pageLoading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  const activeCount = members.filter(m => m.status === 'active').length

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 60px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, marginBottom: 6 }}>Statosphere</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 16, borderBottom: `1px solid ${VR.border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: VR.display, color: VR.text, letterSpacing: '0.02em', margin: 0 }}>The Council</h1>
            <Link href="/dashboard" style={{ fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.08em', padding: '6px 12px', border: `1px solid ${VR.border}`, borderRadius: 6, color: VR.muted, textDecoration: 'none', background: VR.card }}>← Back</Link>
          </div>
        </div>

        {/* Seat counter */}
        <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 6px rgba(22,29,20,0.05)' }}>
          <span style={{ fontSize: 12, fontFamily: VR.display, fontWeight: 700, color: VR.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Seats filled</span>
          <span style={{ fontSize: 18, fontFamily: VR.mono, fontWeight: 700, color: VR.accent }}>{activeCount} / 5</span>
        </div>

        {/* Invite form */}
        <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 14, padding: '18px 18px', marginBottom: 20, boxShadow: '0 1px 6px rgba(22,29,20,0.05)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 14 }}>Invite a member</p>

          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrorMsg('') }}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
            onBlur={e => { e.currentTarget.style.borderColor = VR.border }}
            placeholder="their@email.com"
            style={{ ...inputStyle, marginBottom: 10 }}
          />

          {errorMsg && (
            <p style={{ fontSize: 12, color: VR.rejected, marginBottom: 10, padding: '8px 12px', background: '#F5DADA', borderRadius: 8, border: '1px solid #E0B0B0' }}>{errorMsg}</p>
          )}

          <button
            onClick={handleInvite}
            disabled={!email.trim() || inviteStatus === 'sending' || activeCount >= 5}
            style={{
              width: '100%', padding: '13px 20px',
              background: inviteStatus === 'sent' ? VR.approved : VR.accent,
              color: '#FFFFFF', border: 'none', borderRadius: 10,
              fontSize: 12, fontWeight: 700, fontFamily: VR.display,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: (!email.trim() || inviteStatus === 'sending') ? 'not-allowed' : 'pointer',
              opacity: (!email.trim() || inviteStatus === 'sending') ? 0.5 : 1,
              transition: 'all 0.15s',
            }}>
            {inviteStatus === 'sending' ? 'Sending...' : inviteStatus === 'sent' ? '✓ Invite Sent' : 'Send Invite →'}
          </button>
        </div>

        {/* Members list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, margin: '0 0 4px' }}>Members</p>

          {members.length === 0 ? (
            <div style={{ padding: '28px 20px', border: `1.5px dashed ${VR.border}`, borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic' }}>No members yet. Invite someone above.</p>
            </div>
          ) : members.map(m => {
            const name = m.profiles?.full_name || (m.profiles?.username ? `@${m.profiles.username}` : null) || m.invite_email || 'Invited'
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px',
                background: VR.card,
                border: `1px solid ${VR.border}`,
                borderStyle: m.status === 'pending' ? 'dashed' : 'solid',
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: m.status === 'active' ? `linear-gradient(135deg, ${VR.accent}, ${VR.gold})` : VR.surface,
                    border: `1px solid ${VR.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, fontFamily: VR.display,
                    color: m.status === 'active' ? '#FFFFFF' : VR.muted,
                  }}>
                    {m.status === 'active' ? name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: VR.text, marginBottom: 1 }}>{name}</p>
                    {m.invite_email && m.profiles && (
                      <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>{m.invite_email}</p>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  fontFamily: VR.display, padding: '3px 8px', borderRadius: 4,
                  color: statusColor(m.status), background: statusBg(m.status),
                  border: `1px solid ${statusColor(m.status)}30`,
                }}>
                  {statusLabel(m.status)}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
