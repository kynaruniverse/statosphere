import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { token } = body
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: invite } = await supabase
    .from('council_members')
    .select('id, council_id, status, invite_email')
    .eq('invite_token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
  if (invite.status === 'active') return NextResponse.json({ error: 'Already accepted' }, { status: 400 })

  // Verify the logged-in user's email matches the invite
  const userEmail = user.email?.toLowerCase()
  const inviteEmail = invite.invite_email?.toLowerCase()

  if (inviteEmail && userEmail && userEmail !== inviteEmail) {
    return NextResponse.json(
      { error: 'This invite was sent to a different email address.' },
      { status: 403 }
    )
  }

  // Check council is not full (max 5 active members)
  const { count } = await supabase
    .from('council_members')
    .select('id', { count: 'exact' })
    .eq('council_id', invite.council_id)
    .eq('status', 'active')

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'This Council is full.' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('council_members')
    .update({
      member_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }

  const { data: council } = await supabase
    .from('councils')
    .select('owner_id')
    .eq('id', invite.council_id)
    .single()

  return NextResponse.json({
    success: true,
    council_id: invite.council_id,
    owner_id: council?.owner_id,
  })
}