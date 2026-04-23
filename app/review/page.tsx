'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import type { Submission } from '@/lib/types'

export default function ReviewPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [activeSubmission, setActiveSubmission] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [hasCouncil, setHasCouncil] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: memberOf } = await supabase
        .from('council_members')
        .select('council_id')
        .eq('member_id', user.id)
        .eq('status', 'active')

      const { data: ownedCouncil } = await supabase
        .from('councils')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      const councilIds = Array.from(new Set([
        ...(ownedCouncil ? [ownedCouncil.id] : []),
        ...(memberOf ? memberOf.map((m: any) => m.council_id) : [])
      ]))

      if (councilIds.length === 0) {
        setHasCouncil(false)
        setLoading(false)
        return
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in('council_id', councilIds)

      const taskIds = tasks?.map(t => t.id) || []

      if (taskIds.length === 0) {
        setSubmissions([])
        setLoading(false)
        return
      }

      const { data: subsData } = await supabase
        .from('submissions')
        .select(`
          *,
          tasks(*, stat_categories(*)),
          profiles(full_name, username)
        `)
        .eq('status', 'pending')
        .in('task_id', taskIds)
        .neq('user_id', user.id)
        .order('submitted_at', { ascending: false })

      setSubmissions((subsData || []) as Submission[])
      setLoading(false)
    }

    load()
  }, [router])

  const handleDecision = async (submissionId: string, decision: string) => {
    setReviewing(submissionId)
    setError('')

    try {
      const res = await fetch('/api/review-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          decision,
          comment: comment.trim() || null,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setSubmissions(prev => prev.filter(s => s.id !== submissionId))
      setActiveSubmission(null)
      setComment('')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    }

    setReviewing(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F1117' }}>
        <p style={{ color: '#64748B' }}>Loading submissions...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-8">

        <PageHeader title="Council Review" backHref="/dashboard" />

        {error && (
          <div className="p-3 rounded-xl"
            style={{ backgroundColor: '#1B1F3B', borderLeft: '3px solid #EF4444' }}>
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}

        {!hasCouncil ? (
          <EmptyState
            icon="🏛️"
            title="You're not in a Council yet."
            description="Join or create a Council to start reviewing submissions."
            action={{ label: 'Go to Dashboard', href: '/dashboard' }}
          />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon="✓"
            title="Nothing to review."
            description="When someone submits progress, you'll see it here."
          />
        ) : (
          <div className="space-y-4">
            <p className="text-xs tracking-[0.3em] uppercase"
              style={{ color: '#64748B' }}>
              AWAITING YOUR JUDGMENT — {submissions.length}
            </p>

            {submissions.map(sub => {
              const isActive = activeSubmission === sub.id
              return (
                <div key={sub.id}
                  className="p-5 rounded-2xl border space-y-4"
                  style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>

                  {/* Who submitted */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
                        {(sub as any).profiles?.full_name || `@${(sub as any).profiles?.username}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        {(sub as any).tasks?.stat_categories?.icon}{' '}
                        {(sub as any).tasks?.stat_categories?.name}
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full font-bold"
                      style={{ backgroundColor: '#7C3AED20', color: '#7C3AED' }}>
                      Pending
                    </span>
                  </div>

                  {/* Task title */}
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-1"
                      style={{ color: '#64748B' }}>TASK</p>
                    <p className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
                      {(sub as any).tasks?.title}
                    </p>
                  </div>

                  {/* Submission note */}
                  {sub.note && (
                    <div className="p-3 rounded-xl"
                      style={{ backgroundColor: '#0F1117' }}>
                      <p className="text-xs tracking-widest uppercase mb-1"
                        style={{ color: '#64748B' }}>THEIR SUBMISSION</p>
                      <p className="text-sm leading-relaxed"
                        style={{ color: '#F1F5F9' }}>
                        "{sub.note}"
                      </p>
                    </div>
                  )}

                  {/* Media */}
                  {sub.media_url && (
                    <img
                      src={sub.media_url}
                      alt="Submission evidence"
                      className="w-full rounded-xl object-cover max-h-48"
                    />
                  )}

                  {/* Review panel */}
                  {isActive ? (
                    <div className="space-y-3">
                      <p className="text-xs" style={{ color: '#64748B' }}>
                        Your feedback shapes their growth. Be honest, be fair.
                      </p>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="What did they do well? What should improve?"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none
                          border resize-none"
                        style={{
                          backgroundColor: '#0F1117',
                          borderColor: '#2D3158',
                          color: '#F1F5F9',
                        }}
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleDecision(sub.id, 'approved')}
                          disabled={reviewing === sub.id}
                          className="py-3 rounded-xl font-bold text-sm
                            transition-all active:scale-95 disabled:opacity-40"
                          style={{ backgroundColor: '#A3E635', color: '#0F1117' }}>
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleDecision(sub.id, 'needs_more')}
                          disabled={reviewing === sub.id}
                          className="py-3 rounded-xl font-bold text-sm
                            border transition-all active:scale-95 disabled:opacity-40"
                          style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>
                          → More
                        </button>
                        <button
                          onClick={() => handleDecision(sub.id, 'rejected')}
                          disabled={reviewing === sub.id}
                          className="py-3 rounded-xl font-bold text-sm
                            border transition-all active:scale-95 disabled:opacity-40"
                          style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                          ✗ Reject
                        </button>
                      </div>

                      <button
                        onClick={() => { setActiveSubmission(null); setComment('') }}
                        className="w-full py-2 text-sm"
                        style={{ color: '#64748B' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveSubmission(sub.id)}
                      className="w-full py-3 rounded-xl font-bold text-sm
                        border transition-all active:scale-95"
                      style={{ borderColor: '#7C3AED', color: '#7C3AED' }}>
                      Give Judgment →
                    </button>
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