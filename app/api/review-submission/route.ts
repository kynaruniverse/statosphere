import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendReviewNotification(submissionId: string) {
  try {
    const serviceClient = createSupabaseServiceClient()

    const { data: submission } = await serviceClient
      .from('submissions')
      .select(`
        user_id, status,
        tasks(title, stat_categories(name, icon)),
        feedback(decision, comment, reviewer_id)
      `)
      .eq('id', submissionId)
      .single()

    if (!submission) return

    const { data: authUserData } = await serviceClient.auth.admin.getUserById(
      submission.user_id
    )
    const userEmail = authUserData?.user?.email
    if (!userEmail) return

    // Check user wants email notifications
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('email_notifications')
      .eq('id', submission.user_id)
      .single()

    if (!profile?.email_notifications) return

    const task = (submission as any).tasks
    const feedback = (submission as any).feedback?.[0]
    const stat = task?.stat_categories
    const decision = submission.status
    const isApproved = decision === 'approved'

    const decisionLabel = isApproved
      ? '✓ Approved'
      : decision === 'rejected'
        ? '✗ Rejected'
        : '→ Needs More'
    const decisionColor = isApproved ? '#A3E635' : decision === 'rejected' ? '#EF4444' : '#F59E0B'

    await resend.emails.send({
      from: 'Statosphere <onboarding@resend.dev>',
      to: userEmail,
      subject: `Your Council reviewed your submission — Statosphere`,
      html: `
        <div style="background:#0F1117;color:#F1F5F9;font-family:sans-serif;
          max-width:480px;margin:0 auto;padding:48px 32px;border-radius:16px;">
          <p style="color:#7C3AED;letter-spacing:0.3em;font-size:11px;
            text-transform:uppercase;margin-bottom:32px;">STATOSPHERE</p>
          <h1 style="font-size:28px;font-weight:900;line-height:1.2;margin-bottom:16px;">
            Your Council has spoken.
          </h1>
          <div style="background:#1B1F3B;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="color:#64748B;font-size:12px;margin-bottom:8px;">TASK</p>
            <p style="font-weight:700;margin-bottom:12px;">${task?.title ?? ''}</p>
            <p style="color:#64748B;font-size:12px;margin-bottom:8px;">STAT</p>
            <p style="margin-bottom:12px;">${stat?.icon ?? ''} ${stat?.name ?? ''}</p>
            <p style="color:#64748B;font-size:12px;margin-bottom:8px;">DECISION</p>
            <p style="font-weight:900;color:${decisionColor};">${decisionLabel}</p>
            ${feedback?.comment ? `
              <p style="color:#64748B;font-size:12px;margin-top:16px;margin-bottom:8px;">FEEDBACK</p>
              <p style="color:#F1F5F9;font-style:italic;">"${feedback.comment}"</p>
            ` : ''}
          </div>
          ${isApproved ? `<p style="color:#A3E635;font-weight:700;margin-bottom:24px;">${stat?.name} +5 points</p>` : ''}
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard"
            style="display:block;background:#7C3AED;color:#F1F5F9;
              text-decoration:none;padding:16px 24px;border-radius:12px;
              font-weight:700;font-size:16px;text-align:center;">
            View Your Build →
          </a>
        </div>
      `,
    })
  } catch (err) {
    console.error('Notification send failed (non-fatal):', err)
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { submission_id, decision, comment } = await request.json()

  if (!submission_id || !decision) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!['approved', 'rejected', 'needs_more'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  const { data: submission } = await supabase
    .from('submissions')
    .select('id, task_id, user_id, status, tasks(council_id)')
    .eq('id', submission_id)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }
  if (submission.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 400 })
  }
  // Prevent self-review
  if (submission.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot review your own submission' }, { status: 403 })
  }

  const councilId = (submission as any).tasks?.council_id

  const { data: council } = await supabase
    .from('councils')
    .select('owner_id')
    .eq('id', councilId)
    .single()

  const isOwner = council?.owner_id === user.id
  let isMember = false

  if (!isOwner) {
    const { data: membership } = await supabase
      .from('council_members')
      .select('id')
      .eq('council_id', councilId)
      .eq('member_id', user.id)
      .eq('status', 'active')
      .single()
    isMember = !!membership
  }

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'Not authorised to review' }, { status: 403 })
  }

  // Insert feedback
  const { error: feedbackError } = await supabase.from('feedback').insert({
    submission_id,
    reviewer_id: user.id,
    type: 'review',
    decision,
    comment: comment?.trim() || null,
  })

  if (feedbackError) {
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  // Update submission — triggers DB streak + stat function
  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submission_id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }

  // Send notification (non-blocking, inline)
  sendReviewNotification(submission_id).catch(console.error)

  return NextResponse.json({ success: true })
}