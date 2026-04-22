'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ReviewPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [activeSubmission, setActiveSubmission] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get councils user is a member of
      const { data: memberOf } = await supabase
        .from('council_members')
        .select('council_id')
        .eq('member_id', user.id)
        .eq('status', 'active')

      // Get council user owns
      const { data: ownedCouncil } = await supabase
        .from('councils')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      const councilIds: string[] = []
      if (ownedCouncil) councilIds.push(ownedCouncil.id)
      if (memberOf) memberOf.forEach((m: any) => councilIds.push(m.council_id))

      if (councilIds.length === 0) { setLoading(false); return }

      // Get pending submissions for these councils
      const { data: subsData } = await supabase
        .from('submissions')
        .select(`
          *,
          tasks(*, stat_categories(*), councils(id)),
          profiles(full_name, username)
        `)
        .eq('status', 'pending')
        .in('task_id',
          (await supabase
            .from('tasks')
            .select('id')
            .in('council_id', councilIds)
          ).data?.map((t: any) => t.id) || []
        )
        .neq('user_id', user.id)
        .order('submitted_at', { ascending: false })

      if (subsData) setSubmissions(subsData)
      setLoading(false)
    }
    load()
  }, [router])

  const handleDecision = async (submissionId: string, decision: string) => {
    setReviewing(submissionId)

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
    if (data.success) {
      setSubmissions(prev => prev.filter(s => s.id !== submissionId))
      setActiveSubmission(null)
      setComment('')
    }
    setReviewing(null)
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0F1117' }}>
      <p style={{ color: '#64748B' }}>Loading submissions...</p>
    </main>
  )

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.3em] uppercase"
              style={{ color: '#7C3AED' }}>STATOSPHERE</p>
            <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>
              Council Review
            </h1>
          </div>
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded-xl border"
            style={{ borderColor: '#2D3158', color: '#64748B' }}>
            ← Back
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed text-center space-y-2"
            style={{ borderColor: '#2D3158' }}>
            <p className="font-bold" style={{ color: '#F1F5F9' }}>
              Nothing to review.
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              When Council members submit completions, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs tracking-widest uppercase"
              style={{ color: '#64748B' }}>
              PENDING — {submissions.length}
            </p>

            {submissions.map(sub => (
              <div key={sub.id} className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>

                {/* Submission header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
                      {sub.profiles?.full_name || `@${sub.profiles?.username}` || 'Member'}
                    </p>
                    <span className="text-xs" style={{ color: '#64748B' }}>
                      {new Date(sub.submitted_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{sub.tasks?.stat_categories?.icon}</span>
                    <span className="text-xs font-bold"
                      style={{ color: '#7C3AED' }}>
                      {sub.tasks?.stat_categories?.name}
                    </span>
                  </div>

                  <p className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
                    {sub.tasks?.title}
                  </p>

                  {sub.note && (
                    <p className="text-sm leading-relaxed p-3 rounded-xl"
                      style={{ backgroundColor: '#0F1117', color: '#F1F5F9' }}>
                      "{sub.note}"
                    </p>
                  )}

                  {sub.media_url && (
                    <img src={sub.media_url} alt="Proof"
                      className="w-full rounded-xl object-cover max-h-48" />
                  )}
                </div>

                {/* Review panel */}
                {activeSubmission === sub.id ? (
                  <div className="p-4 border-t space-y-3"
                    style={{ borderColor: '#2D3158' }}>
                    <p className="text-xs" style={{ color: '#64748B' }}>
                      Be honest — this is how they grow.
                    </p>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Leave feedback (optional)..."
                      rows={2}
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
                        className="py-3 rounded-xl font-bold text-sm border
                          transition-all active:scale-95 disabled:opacity-40"
                        style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>
                        → More
                      </button>
                      <button
                        onClick={() => handleDecision(sub.id, 'rejected')}
                        disabled={reviewing === sub.id}
                        className="py-3 rounded-xl font-bold text-sm border
                          transition-all active:scale-95 disabled:opacity-40"
                        style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                        ✗ Reject
                      </button>
                    </div>
                    <button
                      onClick={() => { setActiveSubmission(null); setComment('') }}
                      className="w-full text-sm py-2"
                      style={{ color: '#64748B' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setActiveSubmission(sub.id)}
                      className="w-full py-3 rounded-xl font-bold text-sm
                        transition-all active:scale-95"
                      style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
                      Review This →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}