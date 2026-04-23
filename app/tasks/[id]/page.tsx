'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Task, Submission } from '@/lib/types'
import PageHeader from '@/components/PageHeader'

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          stat_categories(*),
          assigner:profiles!tasks_assigned_by_fkey(id, full_name, username)
        `)
        .eq('id', taskId)
        .single()

      if (taskError || !taskData) { router.push('/dashboard'); return }

      // Only the assignee or council members should see this
      setTask(taskData as Task)

      const { data: subData } = await supabase
        .from('submissions')
        .select('*, feedback(*)')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)

      if (subData && subData.length > 0) {
        setSubmission(subData[0] as Submission)
      }

      setPageLoading(false)
    }

    load()
  }, [taskId, router])

  const handleSubmit = async () => {
    if (!note.trim() && !file) return
    if (!task || task.assigned_to !== userId) return

    setLoading(true)
    setUploadError('')

    let mediaUrl: string | null = null

    if (file) {
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB
      if (file.size > MAX_SIZE) {
        setUploadError('File must be under 10MB')
        setLoading(false)
        return
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only images (JPG, PNG, GIF, WebP) and MP4 videos are allowed')
        setLoading(false)
        return
      }

      const ext = file.name.split('.').pop()
      const path = `${userId}/${taskId}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, file)

      if (uploadError) {
        setUploadError('Upload failed. Please try again.')
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(path)

      mediaUrl = urlData.publicUrl
    }

    if (submission?.status === 'pending') {
      setLoading(false)
      return
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
      setSubmission(newSubmission as Submission)
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

  if (pageLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F1117' }}>
        <p style={{ color: '#64748B' }}>Loading task...</p>
      </main>
    )
  }

  if (!task) return null

  const isAssignedToMe = task.assigned_to === userId
  const canSubmit = isAssignedToMe && task.status === 'active'
  const hasPendingSubmission = submission?.status === 'pending'
  const taskFeedback = (submission as any)?.feedback?.[0]

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-6">

        <PageHeader title="Task" backHref="/dashboard" />

        {/* Task card */}
        <div className="p-5 rounded-2xl border space-y-4"
          style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <p className="text-xs tracking-widest uppercase"
                style={{ color: '#64748B' }}>
                {(task as any).stat_categories?.icon}{' '}
                {(task as any).stat_categories?.name}
              </p>
              <h1 className="font-black text-xl leading-tight"
                style={{ color: '#F1F5F9' }}>
                {task.title}
              </h1>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
              style={{
                backgroundColor: '#0F1117',
                color: statusColor(task.status),
              }}>
              {task.status}
            </span>
          </div>

          {task.description && (
            <p className="text-sm leading-relaxed"
              style={{ color: '#64748B' }}>
              {task.description}
            </p>
          )}

          {(task as any).assigner && (
            <p className="text-xs" style={{ color: '#64748B' }}>
              Assigned by{' '}
              <span style={{ color: '#F1F5F9' }}>
                {(task as any).assigner.full_name || `@${(task as any).assigner.username}`}
              </span>
            </p>
          )}

          {task.due_date && (
            <p className="text-xs" style={{ color: '#64748B' }}>
              Due{' '}
              <span style={{ color: '#F1F5F9' }}>
                {new Date(task.due_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </p>
          )}
        </div>

        {/* Existing submission */}
        {submission && (
          <div className="p-5 rounded-2xl border space-y-3"
            style={{
              backgroundColor: '#1B1F3B',
              borderColor: statusColor(submission.status),
            }}>
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-widest uppercase"
                style={{ color: '#64748B' }}>YOUR SUBMISSION</p>
              <span className="text-xs font-bold"
                style={{ color: statusColor(submission.status) }}>
                {statusLabel(submission.status)}
              </span>
            </div>

            {submission.note && (
              <p className="text-sm leading-relaxed"
                style={{ color: '#F1F5F9' }}>
                "{submission.note}"
              </p>
            )}

            {submission.media_url && (
              <img
                src={submission.media_url}
                alt="Your submission"
                className="w-full rounded-xl object-cover max-h-48"
              />
            )}

            {taskFeedback?.comment && (
              <div className="p-3 rounded-xl"
                style={{ backgroundColor: '#0F1117' }}>
                <p className="text-xs tracking-widest uppercase mb-1"
                  style={{ color: '#64748B' }}>COUNCIL FEEDBACK</p>
                <p className="text-sm italic"
                  style={{ color: '#F1F5F9' }}>
                  "{taskFeedback.comment}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit form */}
        {canSubmit && !hasPendingSubmission && !submitted && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs tracking-widest uppercase"
                style={{ color: '#64748B' }}>SUBMIT YOUR WORK</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What did you do? Be specific — your Council needs details to judge this fairly."
                rows={4}
                className="w-full px-4 py-4 rounded-2xl text-sm outline-none
                  border resize-none"
                style={{
                  backgroundColor: '#1B1F3B',
                  borderColor: note.length > 0 ? '#7C3AED' : '#2D3158',
                  color: '#F1F5F9',
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs tracking-widest uppercase"
                style={{ color: '#64748B' }}>
                PROOF (optional)
              </label>
              <label
                className="w-full py-3 px-4 rounded-2xl border text-sm
                  cursor-pointer flex items-center justify-center gap-2
                  transition-all active:scale-95"
                style={{ borderColor: '#2D3158', color: '#64748B' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? `📎 ${file.name}` : '+ Attach photo or video'}
              </label>
              {uploadError && (
                <p className="text-xs" style={{ color: '#EF4444' }}>
                  {uploadError}
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || (!note.trim() && !file)}
              className="w-full py-4 px-6 rounded-2xl font-bold text-base
                tracking-wide transition-all active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
              {loading ? 'Submitting...' : 'Submit to Council →'}
            </button>

            {!note.trim() && !file && (
              <p className="text-xs text-center" style={{ color: '#64748B' }}>
                Add a note or photo to submit
              </p>
            )}
          </div>
        )}

        {/* Success state */}
        {submitted && (
          <div className="p-5 rounded-2xl border text-center space-y-2"
            style={{ borderColor: '#A3E635' }}>
            <p className="font-bold" style={{ color: '#A3E635' }}>
              ✓ Submitted to your Council.
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              {(task as any).assigner
                ? `${(task as any).assigner.full_name || 'They'} will review it soon.`
                : 'Your Council will review it soon.'}
            </p>
          </div>
        )}

        {/* Waiting state */}
        {hasPendingSubmission && !submitted && (
          <div className="p-5 rounded-2xl border text-center space-y-2"
            style={{ borderColor: '#7C3AED' }}>
            <p className="font-bold" style={{ color: '#7C3AED' }}>
              Waiting for your Council.
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Hang tight — they'll review your submission soon.
            </p>
          </div>
        )}

        {!isAssignedToMe && (
          <div className="p-4 rounded-2xl border text-center"
            style={{ borderColor: '#2D3158' }}>
            <p className="text-sm" style={{ color: '#64748B' }}>
              This task was not assigned to you.
            </p>
          </div>
        )}

      </div>
    </main>
  )
}