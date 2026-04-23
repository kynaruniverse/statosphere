import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { request_id } = body

  if (!request_id) {
    return NextResponse.json({ error: 'request_id required' }, { status: 400 })
  }

  // Load the council request and verify it targets the current user
  const { data: councilRequest } = await supabase
    .from('council_requests')
    .select('id, requester_id, target_user_id, status')
    .eq('id', request_id)
    .single()

  if (!councilRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (councilRequest.target_user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }
  if (councilRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
  }

  // Get the user's council
  const { data: council } = await supabase
    .from('councils')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!council) {
    return NextResponse.json({ error: 'You do not have a council' }, { status: 400 })
  }

  // Server-side council capacity check
  const { count } = await supabase
    .from('council_members')
    .select('id', { count: 'exact' })
    .eq('council_id', council.id)
    .eq('status', 'active')

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Your Council is full. Remove a member first.' },
      { status: 400 }
    )
  }

  // Check requester isn't already a member
  const { data: existing } = await supabase
    .from('council_members')
    .select('id')
    .eq('council_id', council.id)
    .eq('member_id', councilRequest.requester_id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    // Clean up the request and return success
    await supabase
      .from('council_requests')
      .update({ status: 'accepted' })
      .eq('id', request_id)
    return NextResponse.json({ success: true })
  }

  // Add as council member
  const { error: insertError } = await supabase.from('council_members').insert({
    council_id: council.id,
    member_id: councilRequest.requester_id,
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }

  // Update request status
  await supabase
    .from('council_requests')
    .update({ status: 'accepted' })
    .eq('id', request_id)

  return NextResponse.json({ success: true })
}