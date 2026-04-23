import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { email } = body

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Prevent inviting yourself
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const { data: council } = await supabase
    .from('councils')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!council) return NextResponse.json({ error: 'No council found' }, { status: 400 })

  // Check council is not full
  const { count: activeCount } = await supabase
    .from('council_members')
    .select('id', { count: 'exact' })
    .eq('council_id', council.id)
    .eq('status', 'active')

  if ((activeCount ?? 0) >= 5) {
    return NextResponse.json({ error: 'Your Council is full (max 5 members)' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('council_members')
    .select('id, status')
    .eq('council_id', council.id)
    .eq('invite_email', email.toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: existing.status === 'active' ? 'This person is already on your Council' : 'Already invited' },
      { status: 400 }
    )
  }

  const token = crypto.randomUUID()

  const { error: insertError } = await supabase.from('council_members').insert({
    council_id: council.id,
    invite_email: email.toLowerCase(),
    invite_token: token,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const inviterName = profile?.full_name || profile?.username || 'Someone'
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${token}`

  const { error: emailError } = await resend.emails.send({
    from: 'Statosphere <onboarding@resend.dev>',
    to: email,
    subject: `${inviterName} wants you on their Council — Statosphere`,
    html: `
      <div style="background:#0F1117;color:#F1F5F9;font-family:sans-serif;
        max-width:480px;margin:0 auto;padding:48px 32px;border-radius:16px;">
        <p style="color:#7C3AED;letter-spacing:0.3em;font-size:11px;
          text-transform:uppercase;margin-bottom:32px;">STATOSPHERE</p>
        <h1 style="font-size:28px;font-weight:900;line-height:1.2;margin-bottom:16px;">
          ${inviterName} wants you<br/>on their Council.
        </h1>
        <p style="color:#64748B;line-height:1.7;margin-bottom:16px;">
          On Statosphere, a Council is a small group of trusted people 
          who assign real-world challenges, review progress, and give 
          honest feedback — every week.
        </p>
        <p style="color:#64748B;line-height:1.7;margin-bottom:32px;">
          This isn't just a notification. It's a role.<br/>
          <span style="color:#F1F5F9;">${inviterName} chose you specifically.</span>
        </p>
        <a href="${inviteUrl}"
          style="display:block;background:#7C3AED;color:#F1F5F9;
            text-decoration:none;padding:16px 24px;border-radius:12px;
            font-weight:700;font-size:16px;text-align:center;">
          Accept Your Seat →
        </a>
        <p style="color:#2D3158;font-size:12px;margin-top:32px;text-align:center;">
          — Statosphere
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Failed to send invite email:', emailError)
    // Still return success — the invite row was created
  }

  return NextResponse.json({ success: true })
}