'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [task, setTask] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, stat_categories(*), assigner:profiles!tasks_assigned_by_fkey(full_name, username)')
        .eq('id', taskId)
        .single()

      if (!taskData) { router.push('/dashboard'); return }
      setTask(taskData)

      const { data: subData } = await supabase
        .from('submissions')
        .select('*, feedback(*)')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single()

      if (subData) setSubmission(subData)
      setPageLoading(false)
    }
    load()
  }, [taskId, router])

  const handleSubmit = async () => {
    if (!note.trim() && !file) return
    setLoading(true)

    let mediaUrl: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${taskId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(path)
        mediaUrl = urlData.publicUrl
      }
    }

    const { data: newSubmission, error } = await supabase
      .from('submissions')
      .insert({
        task_id: taskId,
        user_id: userId,
        note: note.trim() || null,
        media_url: mediaUrl,
        status: 'pending',
      })
      .select()
      .single()

    if (!error && newSubmission) {
      // Update task status to submitted
      await supabase
        .from('tasks')
        .update({ status: 'submitted' })
        .eq('id', taskId)

      setSubmission(newSubmission)
      setSubmitted(true)
    }

    setLoading(false)
  }

  const statusColor = (status: string) => {
    if (status === 'approved') return '#A3E635'
    if (status === 'rejected') return '#EF4444'
    if (status === 'needs_more') return '#F59E0B'
    if (status === 'pending') return '#7C3AED'
    return '#64748B'
  }

  const statusLabel = (status: string) => {
    if (status === 'approved') return '✓ Approved'
    if (status === 'rejected') return '✗ Rejected'
    if (status === 'needs_more') return '→ Needs More'
    if (status === 'pending') return 'Awaiting review'
    return status
  }

  if (pageLoading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0F1117' }}>
      <p style={{ color: '#64748B' }}>Loading task...</p>
    </main>
  )

  if (!task) return null

  const isAssignedToMe = task.assigned_to === userId
  const canSubmit = isAssignedToMe && task.status === 'active'
  const hasPendingSubmission = submission?.status === 'pending'

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded-xl border"
            style={{ borderColor: '#2D3158', color: '#64748B' }}>
            ← Back
          </Link>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              backgroundColor: '#1B1F3B',
              color: statusColor(task.status)
            }}>
            {statusLabel(task.status)}
          </span>
        </div>

        {/* Task card */}
        <div className="p-5 rounded-2xl border space-y-3"
          style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{task.stat_categories?.icon}</span>
            <span className="text-xs font-bold tracking-widest uppercase"
              style={{ color: '#7C3AED' }}>
              {task.stat_categories?.name}
            </span>
          </div>
          <h1 className="text-xl font-black" style={{ color: '#F1F5F9' }}>
            {task.title}
          </h1>
          {task.description && (
            <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
              {task.description}
            </p>
          )}
          {task.assigner && (
            <p className="text-xs" style={{ color: '#64748B' }}>
              Assigned by{' '}
              <span style={{ color: '#F1F5F9' }}>
                {task.assigner.full_name || `@${task.assigner.username}`}
              </span>
            </p>
          )}
          {task.due_date && (
            <p className="text-xs" style={{ color: '#64748B' }}>
              Due{' '}
              <span style={{ color: '#F1F5F9' }}>
                {new Date(task.due_date).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'short'
                })}
              </span>
            </p>
          )}
        </div>

        {/* Previous submission result */}
        {submission && !submitted && (
          <div className="p-5 rounded-2xl border space-y-3"
            style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>
            <p className="text-xs tracking-widest uppercase"
              style={{ color: '#64748B' }}>
              YOUR SUBMISSION
            </p>
            <span className="inline-block text-sm font-bold px-3 py-1 rounded-full"
              style={{
                backgroundColor: '#0F1117',
                color: statusColor(submission.status)
              }}>
              {statusLabel(submission.status)}
            </span>
            {submission.note && (
              <p className="text-sm leading-relaxed" style={{ color: '#F1F5F9' }}>
                "{submission.note}"
              </p>
            )}
            {submission.media_url && (
              <img src={submission.media_url} alt="Submission proof"
                className="w-full rounded-xl object-cover max-h-48" />
            )}
            {submission.feedback?.length > 0 && (
              <div className="pt-2 border-t space-y-2"
                style={{ borderColor: '#2D3158' }}>
                <p className="text-xs tracking-widest uppercase"
                  style={{ color: '#64748B' }}>
                  COUNCIL FEEDBACK
                </p>
                {submission.feedback.map((f: any) => (
                  <p key={f.id} className="text-sm leading-relaxed"
                    style={{ color: '#F1F5F9' }}>
                    "{f.comment}"
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit form */}
        {canSubmit && !hasPendingSubmission && !submitted && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.3em] uppercase"
                style={{ color: '#64748B' }}>
                SHOW YOUR WORK
              </p>
              <p className="text-sm" style={{ color: '#64748B' }}>
                This doesn't have to be perfect. It has to be real.
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Describe what you did, how it went, what you felt..."
                rows={4}
                className="w-full px-4 py-4 rounded-2xl text-base outline-none
                  border resize-none leading-relaxed"
                style={{
                  backgroundColor: '#1B1F3B',
                  borderColor: note.length > 0 ? '#7C3AED' : '#2D3158',
                  color: '#F1F5F9',
                }}
              />

              {/* Photo upload */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="w-full py-3 px-4 rounded-2xl border text-center text-sm"
                  style={{
                    backgroundColor: '#1B1F3B',
                    borderColor: file ? '#7C3AED' : '#2D3158',
                    color: file ? '#F1F5F9' : '#64748B'
                  }}>
                  {file ? `📎 ${file.name}` : '+ Add a photo (optional)'}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || (!note.trim() && !file)}
                className="w-full py-4 px-6 rounded-2xl font-bold text-base
                  tracking-wide transition-all active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
                {loading ? 'Submitting...' : 'Submit to Council →'}
              </button>
            </div>
          </div>
        )}

        {/* Submitted success state */}
        {submitted && (
          <div className="p-5 rounded-2xl border text-center space-y-3"
            style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>
            <p className="text-2xl">✓</p>
            <p className="font-black text-lg" style={{ color: '#F1F5F9' }}>
              Submitted to your Council.
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              They'll review it and get back to you.
            </p>
            <Link href="/dashboard"
              className="block mt-2 py-3 px-6 rounded-xl font-bold text-sm"
              style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Pending — waiting on council */}
        {hasPendingSubmission && !submitted && (
          <div className="p-5 rounded-2xl border text-center space-y-2"
            style={{ borderColor: '#2D3158' }}>
            <p className="font-bold" style={{ color: '#F1F5F9' }}>
              Awaiting Council review.
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              You'll be notified when they respond.
            </p>
          </div>
        )}

      </div>
    </main>
  )
}