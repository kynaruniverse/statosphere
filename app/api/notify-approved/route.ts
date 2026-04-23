import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { submission_id } = await request.json()
  if (!submission_id) {
    return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })
  }

  // Use service client to look up auth user emails
  const serviceClient = createSupabaseServiceClient()

  const { data: submission } = await serviceClient
    .from('submissions')
    .select(`
      user_id, status,
      tasks(title, stat_category_id, stat_categories(name, icon)),
      feedback(decision, comment, reviewer_id)
    `)
    .eq('id', submission_id)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get user email via admin API (service role required)
  const { data: authUserData } = await serviceClient.auth.admin.getUserById(
    submission.user_id
  )
  const userEmail = authUserData?.user?.email
  if (!userEmail) {
    return NextResponse.json({ error: 'No email for user' }, { status: 400 })
  }

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
  const decisionColor = isApproved
    ? '#A3E635'
    : decision === 'rejected'
      ? '#EF4444'
      : '#F59E0B'

  const { error: emailError } = await resend.emails.send({
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
          <p style="font-weight:700;margin-bottom:12px;">${task?.title ?? 'Unknown task'}</p>
          <p style="color:#64748B;font-size:12px;margin-bottom:8px;">STAT</p>
          <p style="margin-bottom:12px;">${stat?.icon ?? ''} ${stat?.name ?? 'Unknown'}</p>
          <p style="color:#64748B;font-size:12px;margin-bottom:8px;">DECISION</p>
          <p style="font-weight:900;color:${decisionColor};">${decisionLabel}</p>
          ${feedback?.comment ? `
            <p style="color:#64748B;font-size:12px;margin-top:16px;margin-bottom:8px;">
              FEEDBACK
            </p>
            <p style="color:#F1F5F9;font-style:italic;">"${feedback.comment}"</p>
          ` : ''}
        </div>
        ${isApproved ? `
          <p style="color:#A3E635;font-weight:700;margin-bottom:24px;">
            ${stat?.name} +5 points
          </p>
        ` : ''}
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard"
          style="display:block;background:#7C3AED;color:#F1F5F9;
            text-decoration:none;padding:16px 24px;border-radius:12px;
            font-weight:700;font-size:16px;text-align:center;">
          View Your Build →
        </a>
        <p style="color:#2D3158;font-size:12px;margin-top:32px;text-align:center;">
          — Statosphere
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Failed to send notification email:', emailError)
    // Don't fail the request — notification is non-critical
  }

  return NextResponse.json({ success: true })
}