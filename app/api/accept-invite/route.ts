import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: invite } = await supabase
    .from('council_members')
    .select('id, council_id, status, invite_email')
    .eq('invite_token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
  if (invite.status === 'active') return NextResponse.json({ error: 'Already accepted' }, { status: 400 })

  await supabase
    .from('council_members')
    .update({
      member_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  const { data: council } = await supabase
    .from('councils')
    .select('owner_id')
    .eq('id', invite.council_id)
    .single()

  return NextResponse.json({
    success: true,
    council_id: invite.council_id,
    owner_id: council?.owner_id
  })
}