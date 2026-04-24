'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

type Activity = {
  id: string
  type: string
  title: string
  meta: any
  created_at: string
}

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', approved: '#2D6A3F', rejected: '#A0302A',
  pending: '#7A6020', pendingBg: '#F0E4C0',
  display: "'Cinzel','Times New Roman',serif",
  mono: "'JetBrains Mono','Courier New',monospace",
}

export default function ActivityPage() {
  const router = useRouter()
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setActivity(data)
      setLoading(false)
    }
    load()
  }, [router])

  const getIcon = (type: string) => {
    if (type === 'task_approved')   return '✓'
    if (type === 'task_rejected')   return '✗'
    if (type === 'task_needs_more') return '→'
    return '•'
  }

  const getColor = (type: string) => {
    if (type === 'task_approved')   return VR.approved
    if (type === 'task_rejected')   return VR.rejected
    if (type === 'task_needs_more') return VR.pending
    return VR.muted
  }

  const getBg = (type: string) => {
    if (type === 'task_approved')   return '#D0E8D8'
    if (type === 'task_rejected')   return '#F5DADA'
    if (type === 'task_needs_more') return VR.pendingBg
    return VR.surface
  }

  const getLabel = (item: Activity) => {
    if (item.type === 'task_approved')   return `${item.meta?.stat} +${item.meta?.points} XP`
    if (item.type === 'task_rejected')   return `${item.meta?.stat} — not approved`
    if (item.type === 'task_needs_more') return `${item.meta?.stat} — needs more work`
    return ''
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 60px', fontFamily: "'Spectral','Georgia',serif" }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        <PageHeader title="Activity" backHref="/dashboard" />

        {activity.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No activity yet."
            description="Council decisions and stat changes will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activity.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px',
                background: VR.card,
                border: `1px solid ${VR.border}`,
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(22,29,20,0.05)',
              }}>
                {/* Icon badge */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: getBg(item.type),
                  border: `1px solid ${getColor(item.type)}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: VR.mono, fontWeight: 700, fontSize: 13,
                  color: getColor(item.type),
                }}>
                  {getIcon(item.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: VR.text, marginBottom: 3, lineHeight: 1.4 }}>
                    {item.title}
                  </p>
                  {getLabel(item) && (
                    <p style={{
                      fontSize: 11, fontWeight: 700,
                      fontFamily: VR.display, letterSpacing: '0.08em',
                      color: getColor(item.type), marginBottom: 3,
                    }}>
                      {getLabel(item)}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
