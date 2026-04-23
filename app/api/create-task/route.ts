import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCycleKey } from '@/lib/cycle'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { council_id, assigned_to, stat_category_id, title, description, due_date } = body

  if (!council_id || !assigned_to || !stat_category_id || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const trimmedTitle = String(title).trim()
  if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
    return NextResponse.json({ error: 'Title must be between 3 and 200 characters' }, { status: 400 })
  }

  const { data: council } = await supabase
    .from('councils')
    .select('owner_id')
    .eq('id', council_id)
    .single()

  const isOwner = council?.owner_id === user.id
  let isMember = false

  if (!isOwner) {
    const { data: membership } = await supabase
      .from('council_members')
      .select('id')
      .eq('council_id', council_id)
      .eq('member_id', user.id)
      .eq('status', 'active')
      .single()
    isMember = !!membership
  }

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'Not a council member' }, { status: 403 })
  }

  // Validate assigned_to is a member of this council or the owner
  const isAssignedToOwner = council?.owner_id === assigned_to
  let isAssignedToMember = false

  if (!isAssignedToOwner) {
    const { data: targetMembership } = await supabase
      .from('council_members')
      .select('id')
      .eq('council_id', council_id)
      .eq('member_id', assigned_to)
      .eq('status', 'active')
      .single()
    isAssignedToMember = !!targetMembership
  }

  if (!isAssignedToOwner && !isAssignedToMember) {
    return NextResponse.json({ error: 'Cannot assign task to non-member' }, { status: 403 })
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      council_id,
      assigned_to,
      assigned_by: user.id,
      stat_category_id,
      title: trimmedTitle,
      description: description?.trim() || null,
      due_date: due_date || null,
      cycle_week: getCycleKey(),
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.rpc('log_activity', {
    p_user_id: user.id,
    p_type: 'task_assigned',
    p_title: trimmedTitle,
    p_meta: { council_id, assigned_to },
  })

  return NextResponse.json({ success: true, task })
}