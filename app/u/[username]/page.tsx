import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import PublicProfileClient from './PublicProfileClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, becoming_statement')
    .eq('username', username.toLowerCase())
    .single()

  if (!profile) return { title: 'Profile not found — Statosphere' }

  return {
    title: `@${profile.username} — Statosphere`,
    description: profile.becoming_statement
      ? `"${profile.becoming_statement}"`
      : `${profile.full_name || profile.username}'s build on Statosphere`,
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .eq('profile_public', true)
    .single()

  if (!profile) notFound()

  const [
    { data: userStats },
    { data: streaks },
    { data: council },
  ] = await Promise.all([
    supabase.from('user_stats').select('*, stat_categories(*)').eq('user_id', profile.id),
    supabase.from('streaks').select('*').eq('user_id', profile.id),
    supabase.from('councils').select('id').eq('owner_id', profile.id).maybeSingle(),
  ])

  const { count: councilSize } = await supabase
    .from('council_members')
    .select('id', { count: 'exact' })
    .eq('council_id', council?.id ?? '')
    .eq('status', 'active')

  const { count: approvedCount } = await supabase
    .from('submissions')
    .select('id', { count: 'exact' })
    .eq('user_id', profile.id)
    .eq('status', 'approved')

  return (
    <PublicProfileClient
      profile={profile}
      userStats={userStats || []}
      streaks={streaks || []}
      councilSize={councilSize || 0}
      approvedCount={approvedCount || 0}
    />
  )
}