import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

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

  const { data: existing } = await supabase
    .from('council_members')
    .select('id, status')
    .eq('council_id', council.id)
    .eq('invite_email', email.toLowerCase())
    .single()

  if (existing) return NextResponse.json({ error: 'Already invited' }, { status: 400 })

  const token = crypto.randomUUID()

  await supabase.from('council_members').insert({
    council_id: council.id,
    invite_email: email.toLowerCase(),
    invite_token: token,
    status: 'pending',
  })

  const inviterName = profile?.full_name || profile?.username || 'Someone'
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${token}`

  await resend.emails.send({
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

  return NextResponse.json({ success: true })
}