'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Profile, UserStat, Task } from '@/lib/types'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStat[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [councilCount, setCouncilCount] = useState(0)
  const [pendingReviews, setPendingReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData?.onboarding_complete) {
        router.push('/onboarding')
        return
      }
      setProfile(profileData)

      // Stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*, stat_categories(*)')
        .eq('user_id', user.id)
      if (statsData) setStats(statsData)

      // Active tasks assigned to me
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, stat_categories(*)')
        .eq('assigned_to', user.id)
        .in('status', ['active', 'submitted'])
        .order('created_at', { ascending: false })
      if (tasksData) setTasks(tasksData)

      // Council count
      const { data: council } = await supabase
        .from('councils')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (council) {
        const { count } = await supabase
          .from('council_members')
          .select('id', { count: 'exact' })
          .eq('council_id', council.id)
          .eq('status', 'active')
        setCouncilCount(count || 0)
      }

      // Pending reviews — submissions from councils I'm on
      const { data: memberOf } = await supabase
        .from('council_members')
        .select('council_id')
        .eq('member_id', user.id)
        .eq('status', 'active')

      const councilIds: string[] = []
      if (council) councilIds.push(council.id)
      if (memberOf) memberOf.forEach((m: any) => councilIds.push(m.council_id))

      if (councilIds.length > 0) {
        const { data: taskIds } = await supabase
          .from('tasks')
          .select('id')
          .in('council_id', councilIds)

        if (taskIds && taskIds.length > 0) {
          const { count: reviewCount } = await supabase
            .from('submissions')
            .select('id', { count: 'exact' })
            .eq('status', 'pending')
            .in('task_id', taskIds.map((t: any) => t.id))
            .neq('user_id', user.id)

          setPendingReviews(reviewCount || 0)
        }
      }

      setLoading(false)
    }
    load()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const taskStatusColor = (status: string) => {
    if (status === 'submitted') return '#F59E0B'
    return '#A3E635'
  }

  const taskStatusLabel = (status: string) => {
    if (status === 'submitted') return 'Submitted'
    return 'Active'
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0F1117' }}>
      <p style={{ color: '#64748B' }}>Loading your build...</p>
    </main>
  )

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.3em] uppercase"
              style={{ color: '#7C3AED' }}>STATOSPHERE</p>
            <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>
              @{profile?.username}
            </h1>
          </div>
          <button onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-xl border"
            style={{ borderColor: '#2D3158', color: '#64748B' }}>
            Sign out
          </button>
        </div>

        {/* Pending reviews banner */}
        {pendingReviews > 0 && (
          <Link href="/review"
            className="flex items-center justify-between p-4 rounded-2xl
              transition-all active:scale-95"
            style={{ backgroundColor: '#7C3AED' }}>
            <div>
              <p className="font-black text-sm" style={{ color: '#F1F5F9' }}>
                {pendingReviews} submission{pendingReviews > 1 ? 's' : ''} waiting for your review
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#E2D9F3' }}>
                Your Council members are waiting on you
              </p>
            </div>
            <span style={{ color: '#F1F5F9' }}>→</span>
          </Link>
        )}

        {/* Becoming statement */}
        <div className="p-5 rounded-2xl border"
          style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>
          <p className="text-xs tracking-widest uppercase mb-2"
            style={{ color: '#7C3AED' }}>BECOMING</p>
          <p className="leading-relaxed" style={{ color: '#F1F5F9' }}>
            "{profile?.becoming_statement}"
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <p className="text-xs tracking-[0.3em] uppercase"
            style={{ color: '#64748B' }}>YOUR STATS</p>
          {stats.map(stat => (
            <div key={stat.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{(stat as any).stat_categories?.icon}</span>
                  <span className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
                    {(stat as any).stat_categories?.name}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold"
                  style={{ color: '#A3E635' }}>
                  {stat.current_value}
                </span>
              </div>
              <div className="w-full h-2 rounded-full"
                style={{ backgroundColor: '#1B1F3B' }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(stat.current_value, 2)}%`,
                    backgroundColor: '#7C3AED',
                  }} />
              </div>
            </div>
          ))}
        </div>

        {/* Council */}
        <div className="p-5 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>
          <div className="space-y-1">
            <p className="text-xs tracking-widest uppercase"
              style={{ color: '#7C3AED' }}>YOUR COUNCIL</p>
            <p className="font-bold" style={{ color: '#F1F5F9' }}>
              {councilCount === 0
                ? 'No members yet'
                : `${councilCount} active member${councilCount > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/council"
            className="px-4 py-2 rounded-xl font-bold text-sm
              transition-all active:scale-95"
            style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
            Manage →
          </Link>
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-[0.3em] uppercase"
              style={{ color: '#64748B' }}>
              MY TASKS — {tasks.length}
            </p>
            <Link href="/tasks/assign"
              className="text-xs font-bold px-3 py-1 rounded-lg"
              style={{ backgroundColor: '#1B1F3B', color: '#A3E635' }}>
              + Assign Task
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed text-center space-y-2"
              style={{ borderColor: '#2D3158' }}>
              <p className="font-bold" style={{ color: '#F1F5F9' }}>
                No active tasks.
              </p>
              <p className="text-sm" style={{ color: '#64748B' }}>
                Your Council hasn't assigned anything yet.
              </p>
            </div>
          ) : (
            tasks.map(task => (
              <Link key={task.id} href={`/tasks/${task.id}`}
                className="block p-4 rounded-2xl border transition-all active:scale-95"
                style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span>{(task as any).stat_categories?.icon}</span>
                      <span className="text-xs font-bold"
                        style={{ color: '#7C3AED' }}>
                        {(task as any).stat_categories?.name}
                      </span>
                    </div>
                    <p className="font-bold text-sm" style={{ color: '#F1F5F9' }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs leading-relaxed"
                        style={{ color: '#64748B' }}>
                        {task.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: '#0F1117',
                      color: taskStatusColor(task.status)
                    }}>
                    {taskStatusLabel(task.status)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </main>
  )
}