'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  approved: '#2D6A3F', rejected: '#A0302A',
  pendingBg: '#F0E4C0', pending: '#7A6020',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

type CouncilRequest = {
  id: string
  requester_id: string        // ← correct column name in schema
  message: string | null
  created_at: string
  profiles: { full_name: string | null; username: string | null } | null
}

export default function RequestsPage() {
  const router = useRouter()
  const [requests, setRequests]   = useState<CouncilRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState<string | null>(null)
  const [userId, setUserId]       = useState('')
  const [seatsLeft, setSeatsLeft] = useState(5)
  const [councilId, setCouncilId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      // Seat count
      const { data: council } = await supabase
        .from('councils').select('id').eq('owner_id', user.id).single()
      if (council) {
        setCouncilId(council.id)
        const { count } = await supabase
          .from('council_members')
          .select('id', { count: 'exact', head: true })
          .eq('council_id', council.id)
          .eq('status', 'active')
        setSeatsLeft(5 - (count || 0))
      }

      // ── Fetch requests targeting this user ────────────────────────────────
      // Schema: council_requests.target_user_id = this user's id
      const { data: reqs } = await supabase
        .from('council_requests')
        .select('*, profiles:requester_id(full_name, username)')
        .eq('target_user_id', user.id)          // ← correct column
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (reqs) setRequests(reqs as CouncilRequest[])
      setLoading(false)
    }
    load()
  }, [router])

  const handleDecision = async (req: CouncilRequest, accepted: boolean) => {
    if (!councilId) return
    setActing(req.id)

    // Update the request status
    await supabase
      .from('council_requests')
      .update({ status: accepted ? 'accepted' : 'declined' })
      .eq('id', req.id)

    if (accepted && seatsLeft > 0) {
      // Add requester as an active council member
      await supabase.from('council_members').insert({
        council_id: councilId,
        member_id: req.requester_id,            // ← correct column
        status: 'active',
      })
      setSeatsLeft(s => s - 1)
    }

    setRequests(prev => prev.filter(r => r.id !== req.id))
    setActing(null)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 80px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        <PageHeader title="Council Requests" backHref="/dashboard" />

        {/* Seat count banner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: VR.card, border: `1px solid ${VR.border}`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          boxShadow: '0 1px 6px rgba(22,29,20,0.05)',
        }}>
          <span style={{ fontSize: 12, fontFamily: VR.display, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: VR.muted }}>Seats available</span>
          <span style={{
            fontSize: 15, fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontWeight: 700, color: seatsLeft > 0 ? VR.accent : VR.rejected,
          }}>
            {seatsLeft} / 5
          </span>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="No pending requests."
            description="When someone requests a seat on your Council, they'll appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(req => {
              const name = req.profiles?.full_name
                || (req.profiles?.username ? `@${req.profiles.username}` : 'Unknown')
              return (
                <div key={req.id} style={{
                  background: VR.card, border: `1px solid ${VR.border}`,
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(22,29,20,0.05)',
                }}>
                  {/* Header */}
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${VR.accent}, ${VR.gold})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, fontFamily: VR.display, color: '#FFFFFF',
                    }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: VR.text, marginBottom: 2 }}>{name}</p>
                      <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>Requested {formatDate(req.created_at)}</p>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                      fontFamily: VR.display, padding: '3px 8px', borderRadius: 4,
                      color: VR.pending, background: VR.pendingBg, border: `1px solid ${VR.pending}30`,
                      whiteSpace: 'nowrap',
                    }}>
                      ◌ Pending
                    </span>
                  </div>

                  {/* Message */}
                  {req.message && (
                    <div style={{ padding: '0 18px 14px' }}>
                      <div style={{ background: VR.surface, border: `1px solid ${VR.border}`, borderRadius: 10, padding: '12px 14px' }}>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 6 }}>Their message</p>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: VR.text, fontStyle: 'italic' }}>"{req.message}"</p>
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div style={{ borderTop: `1px solid ${VR.border}`, padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => handleDecision(req, false)}
                      disabled={acting === req.id}
                      style={{ padding: '10px', background: '#F5DADA', color: VR.rejected, border: `1px solid ${VR.rejected}30`, borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: acting === req.id ? 'not-allowed' : 'pointer', opacity: acting === req.id ? 0.5 : 1 }}>
                      ✗ Decline
                    </button>
                    <button
                      onClick={() => handleDecision(req, true)}
                      disabled={acting === req.id || seatsLeft === 0}
                      style={{ padding: '10px', background: VR.accent, color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: (acting === req.id || seatsLeft === 0) ? 'not-allowed' : 'pointer', opacity: (acting === req.id || seatsLeft === 0) ? 0.5 : 1 }}>
                      {seatsLeft === 0 ? 'Full' : '✓ Accept'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
