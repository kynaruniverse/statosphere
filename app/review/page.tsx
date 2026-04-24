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
  approved: '#2D6A3F', rejected: '#A0302A', pending: '#7A6020', pendingBg: '#F0E4C0',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

type PendingSub = {
  id: string
  note: string | null
  media_url: string | null
  submitted_at: string
  tasks: {
    id: string
    title: string
    description: string | null
    stat_categories: { name: string; icon: string } | null
  } | null
  profiles: { full_name: string | null; username: string | null } | null
}

export default function ReviewPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<PendingSub[]>([])
  const [loading, setLoading]         = useState(true)
  const [reviewing, setReviewing]     = useState<string | null>(null)
  const [comment, setComment]         = useState('')
  const [activeId, setActiveId]       = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Find councils where I'm an active member
      const { data: seats } = await supabase
        .from('council_members')
        .select('council_id')
        .eq('member_id', user.id)
        .eq('status', 'active')

      if (!seats?.length) { setLoading(false); return }
      const ownerIds: string[] = []

      for (const seat of seats) {
        const { data: council } = await supabase
          .from('councils').select('owner_id').eq('id', seat.council_id).single()
        if (council) ownerIds.push(council.owner_id)
      }

      if (!ownerIds.length) { setLoading(false); return }

      const { data: subs } = await supabase
        .from('submissions')
        .select('*, tasks(id, title, description, stat_categories(name, icon)), profiles(full_name, username)')
        .in('user_id', ownerIds)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })

      if (subs) setSubmissions(subs as PendingSub[])
      setLoading(false)
    }
    load()
  }, [router])

  const handleDecision = async (subId: string, decision: 'approved' | 'rejected' | 'needs_more') => {
    setReviewing(subId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('submissions').update({ status: decision }).eq('id', subId)
    await supabase.from('feedback').insert({ submission_id: subId, reviewer_id: user.id, decision, comment: comment.trim() || null })

    setSubmissions(prev => prev.filter(s => s.id !== subId))
    setReviewing(null)
    setComment('')
    setActiveId(null)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  if (loading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 80px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        <PageHeader title="Council Reviews" backHref="/dashboard" />

        {submissions.length === 0 ? (
          <EmptyState
            icon="⚖️"
            title="Queue is clear."
            description="No pending submissions from your council members. Check back after the next cycle."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {submissions.map(sub => {
              const isOpen = activeId === sub.id
              return (
                <div key={sub.id} style={{
                  background: VR.card,
                  border: `1px solid ${isOpen ? VR.accent : VR.border}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(22,29,20,0.06)',
                  transition: 'border-color 0.15s',
                }}>
                  {/* Header */}
                  <div
                    onClick={() => setActiveId(isOpen ? null : sub.id)}
                    style={{ padding: '16px 18px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <span style={{ fontSize: 13 }}>{sub.tasks?.stat_categories?.icon}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted }}>
                            {sub.tasks?.stat_categories?.name}
                          </span>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, fontFamily: VR.display, color: VR.text, letterSpacing: '0.02em', lineHeight: 1.3, margin: 0 }}>
                          {sub.tasks?.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                        {formatDate(sub.submitted_at)}
                      </span>
                    </div>

                    {/* Submitter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${VR.accent}, ${VR.gold})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, fontFamily: VR.display, color: '#FFFFFF',
                      }}>
                        {(sub.profiles?.full_name || sub.profiles?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, color: VR.muted }}>
                        {sub.profiles?.full_name || `@${sub.profiles?.username}`}
                      </span>
                    </div>
                  </div>

                  {/* Expanded review panel */}
                  {isOpen && (
                    <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${VR.border}` }}>

                      {/* Their note */}
                      {sub.note && (
                        <div style={{ padding: '14px 0', borderBottom: `1px solid ${VR.surface}`, marginBottom: 14 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 8 }}>Their report</p>
                          <p style={{ fontSize: 13, lineHeight: 1.65, color: VR.text, fontStyle: 'italic' }}>"{sub.note}"</p>
                        </div>
                      )}

                      {/* Media */}
                      {sub.media_url && (
                        <div style={{ marginBottom: 14 }}>
                          {sub.media_url.endsWith('.mp4') ? (
                            <video src={sub.media_url} controls style={{ width: '100%', borderRadius: 10, border: `1px solid ${VR.border}`, maxHeight: 260, objectFit: 'cover' }} />
                          ) : (
                            <img src={sub.media_url} alt="Submission" style={{ width: '100%', borderRadius: 10, border: `1px solid ${VR.border}`, maxHeight: 260, objectFit: 'cover' }} />
                          )}
                        </div>
                      )}

                      {/* Comment */}
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Leave a comment for them (optional)..."
                        rows={3}
                        style={{
                          width: '100%', padding: '12px 14px',
                          border: `1.5px solid ${VR.border}`, borderRadius: 10,
                          fontSize: 13, color: VR.text, background: VR.surface,
                          outline: 'none', resize: 'none', lineHeight: 1.6,
                          fontFamily: VR.body, boxSizing: 'border-box', marginBottom: 12,
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
                        onBlur={e => { e.currentTarget.style.borderColor = VR.border }}
                      />

                      {/* Decision buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { key: 'approved',   label: '✓ Approve', bg: VR.approved, color: '#FFFFFF' },
                          { key: 'needs_more', label: '→ Needs More', bg: VR.pendingBg, color: VR.pending },
                          { key: 'rejected',   label: '✗ Reject', bg: '#F5DADA', color: VR.rejected },
                        ].map(btn => (
                          <button
                            key={btn.key}
                            onClick={() => handleDecision(sub.id, btn.key as any)}
                            disabled={reviewing === sub.id}
                            style={{
                              padding: '10px 8px',
                              background: btn.bg, color: btn.color,
                              border: `1px solid ${btn.color}30`,
                              borderRadius: 8, fontSize: 10, fontWeight: 700,
                              fontFamily: VR.display, letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              cursor: reviewing === sub.id ? 'not-allowed' : 'pointer',
                              opacity: reviewing === sub.id ? 0.5 : 1,
                            }}>
                            {reviewing === sub.id ? '...' : btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
