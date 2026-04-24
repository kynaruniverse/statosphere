'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import type { Task, Submission } from '@/lib/types'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  approved: '#2D6A3F', rejected: '#A0302A', pending: '#7A6020', pendingBg: '#F0E4C0',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  approved:   { label: '✓ Approved',   color: '#2D6A3F', bg: '#D0E8D8' },
  rejected:   { label: '✗ Rejected',   color: '#A0302A', bg: '#F5DADA' },
  needs_more: { label: '→ Needs More', color: '#7A6020', bg: '#F0E4C0' },
  pending:    { label: '◌ Awaiting Council', color: '#627056', bg: '#DDE5D5' },
}

export default function TaskDetailPage() {
  const router   = useRouter()
  const params   = useParams()
  const taskId   = params.id as string

  const [task, setTask]             = useState<Task | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [userId, setUserId]         = useState('')
  const [note, setNote]             = useState('')
  const [file, setFile]             = useState<File | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('*, stat_categories(*), assigner:profiles!tasks_assigned_by_fkey(id, full_name, username)')
        .eq('id', taskId).single()

      if (error || !taskData) { router.push('/dashboard'); return }
      setTask(taskData as Task)

      const { data: subData } = await supabase
        .from('submissions').select('*, feedback(*)')
        .eq('task_id', taskId).eq('user_id', user.id)
        .order('submitted_at', { ascending: false }).limit(1)

      if (subData?.length) setSubmission(subData[0] as Submission)
      setPageLoading(false)
    }
    load()
  }, [taskId, router])

  const handleSubmit = async () => {
    if (!note.trim() && !file) return
    if (!task || task.assigned_to !== userId) return
    setLoading(true); setUploadError('')

    let mediaUrl: string | null = null

    if (file) {
      const MAX = 10 * 1024 * 1024
      if (file.size > MAX) { setUploadError('File must be under 10MB'); setLoading(false); return }
      const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4']
      if (!allowed.includes(file.type)) { setUploadError('Only images (JPG, PNG, GIF, WebP) and MP4 allowed'); setLoading(false); return }

      const ext  = file.name.split('.').pop()
      const path = `${userId}/${taskId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('submissions').upload(path, file)
      if (uploadErr) { setUploadError('Upload failed. Please try again.'); setLoading(false); return }
      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path)
      mediaUrl = urlData.publicUrl
    }

    if (submission?.status === 'pending') { setLoading(false); return }

    const { data: newSub, error } = await supabase
      .from('submissions')
      .insert({ task_id: taskId, user_id: userId, note: note.trim() || null, media_url: mediaUrl, status: 'pending' })
      .select().single()

    if (!error && newSub) setSubmission(newSub as Submission)
    setLoading(false)
  }

  if (pageLoading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  if (!task) return null

  const isAssignedToMe = task.assigned_to === userId
  const canSubmit      = isAssignedToMe && task.status === 'active'
  const hasPending     = submission?.status === 'pending'
  const feedback       = (submission as any)?.feedback?.[0]
  const subStatus      = submission ? statusMeta[submission.status] : null

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 60px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        <PageHeader title="Task" backHref="/dashboard" />

        {/* Task card */}
        <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 14, padding: '18px 18px', marginBottom: 16, boxShadow: '0 2px 12px rgba(22,29,20,0.06)' }}>

          {/* Stat + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{(task as any).stat_categories?.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted }}>
                  {(task as any).stat_categories?.name}
                </span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.display, color: VR.text, letterSpacing: '0.02em', lineHeight: 1.3, margin: 0 }}>
                {task.title}
              </h2>
            </div>
            {subStatus && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: VR.display, padding: '4px 10px', borderRadius: 4, whiteSpace: 'nowrap',
                color: subStatus.color, background: subStatus.bg,
                border: `1px solid ${subStatus.color}30`,
              }}>{subStatus.label}</span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p style={{ fontSize: 13, lineHeight: 1.65, color: VR.muted, fontStyle: 'italic', paddingTop: 12, borderTop: `1px solid ${VR.border}` }}>
              {task.description}
            </p>
          )}

          {/* Assigner */}
          {(task as any).assigner && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${VR.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: VR.muted }}>Assigned by</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: VR.text }}>
                {(task as any).assigner.full_name || `@${(task as any).assigner.username}`}
              </span>
            </div>
          )}
        </div>

        {/* Feedback from previous review */}
        {feedback && (
          <div style={{
            background: subStatus ? subStatus.bg : VR.surface,
            border: `1px solid ${subStatus ? subStatus.color + '30' : VR.border}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 8 }}>
              Council Feedback
            </p>
            {feedback.comment ? (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: VR.text, fontStyle: 'italic' }}>
                "{feedback.comment}"
              </p>
            ) : (
              <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic' }}>No comment left.</p>
            )}
          </div>
        )}

        {/* Submission form */}
        {canSubmit && !hasPending && (
          <div style={{ background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 14, padding: '18px 18px', boxShadow: '0 2px 12px rgba(22,29,20,0.06)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, marginBottom: 14 }}>
              {submission?.status === 'needs_more' ? 'Resubmit your work' : 'Submit your work'}
            </p>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe what you did, what you learned, any proof of completion..."
              rows={4}
              style={{
                width: '100%', padding: '13px 16px',
                border: `1.5px solid ${note.length > 0 ? VR.accent : VR.border}`,
                borderRadius: 10, fontSize: 14, color: VR.text, background: VR.card,
                outline: 'none', resize: 'none', lineHeight: 1.6,
                fontFamily: VR.body, marginBottom: 12,
                transition: 'border-color 0.15s', boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = note.length > 0 ? VR.accent : VR.border }}
            />

            {/* File upload */}
            <label style={{
              display: 'block', padding: '11px 16px',
              border: `1.5px dashed ${VR.border}`, borderRadius: 10,
              cursor: 'pointer', marginBottom: 12, textAlign: 'center',
              background: file ? VR.accentMuted : VR.surface,
            }}>
              <input type="file" accept="image/*,video/mp4" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              <p style={{ fontSize: 12, color: file ? VR.accent : VR.muted, fontWeight: 600 }}>
                {file ? `✓ ${file.name}` : '+ Attach image or video (optional)'}
              </p>
            </label>

            {uploadError && <p style={{ fontSize: 12, color: VR.rejected, marginBottom: 10 }}>{uploadError}</p>}

            <button
              onClick={handleSubmit}
              disabled={(!note.trim() && !file) || loading}
              style={{
                width: '100%', padding: '13px 20px',
                background: VR.accent, color: '#FFFFFF',
                border: 'none', borderRadius: 10,
                fontSize: 12, fontWeight: 700, fontFamily: VR.display,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: ((!note.trim() && !file) || loading) ? 'not-allowed' : 'pointer',
                opacity: ((!note.trim() && !file) || loading) ? 0.5 : 1,
              }}>
              {loading ? 'Submitting...' : 'Submit to Council →'}
            </button>
          </div>
        )}

        {/* Awaiting review message */}
        {hasPending && (
          <div style={{ padding: '20px 18px', background: VR.surface, border: `1px solid ${VR.border}`, borderRadius: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 20, marginBottom: 8 }}>⏳</p>
            <p style={{ fontSize: 13, fontWeight: 700, fontFamily: VR.display, color: VR.text, marginBottom: 4 }}>Awaiting Council review</p>
            <p style={{ fontSize: 12, color: VR.muted, fontStyle: 'italic' }}>Your submission has been sent. The Council will weigh in soon.</p>
          </div>
        )}

      </div>
    </main>
  )
}
