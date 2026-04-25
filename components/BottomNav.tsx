'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const VR = {
  bg:      '#FFFFFF',
  border:  '#C4D0B8',
  text:    '#161D14',
  muted:   '#A8BCA0',
  accent:  '#2D6A3F',
  surface: '#DDE5D5',
  display: "'Cinzel','Times New Roman',serif",
}

// Pages where the nav should NOT appear
const HIDDEN_ON = ['/', '/onboarding', '/join']

type Tab = {
  id:    string
  label: string
  icon:  string
  href:  string
  match: string[]    // path prefixes that make this tab "active"
}

const TABS: Tab[] = [
  { id: 'build',   label: 'Build',   icon: '⚔️',  href: '/dashboard',    match: ['/dashboard'] },
  { id: 'tasks',   label: 'Tasks',   icon: '📋',  href: '/tasks/assign', match: ['/tasks'] },
  { id: 'review',  label: 'Review',  icon: '⚖️',  href: '/review',       match: ['/review'] },
  { id: 'council', label: 'Council', icon: '🛡️',  href: '/council',      match: ['/council', '/requests'] },
  { id: 'you',     label: 'You',     icon: '👤',  href: '/settings',     match: ['/settings', '/activity'] },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()

  const [reviewCount, setReviewCount] = useState(0)
  const [username, setUsername]       = useState<string | null>(null)

  // Don't render on auth/onboarding/join pages
  const hidden = HIDDEN_ON.some(p => pathname === p)
    || pathname.startsWith('/u/')
    || pathname.startsWith('/auth/')
  if (hidden) return null

  // ── Fetch pending review count + username ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get username for profile link
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      if (profile?.username) setUsername(profile.username)

      // Count pending submissions for councils where this user is a member
      const { data: seats } = await supabase
        .from('council_members')
        .select('council_id')
        .eq('member_id', user.id)
        .eq('status', 'active')

      if (!seats?.length) return

      const ownerIds: string[] = []
      for (const seat of seats) {
        const { data: council } = await supabase
          .from('councils').select('owner_id').eq('id', seat.council_id).single()
        if (council) ownerIds.push(council.owner_id)
      }

      if (!ownerIds.length) return

      const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .in('user_id', ownerIds)
        .eq('status', 'pending')

      setReviewCount(count || 0)
    }

    load()

    // Re-poll every 60s
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const isActive = (tab: Tab) =>
    tab.match.some(prefix => pathname.startsWith(prefix))

  return (
    <>
      {/* Spacer so page content isn't hidden behind nav */}
      <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }} />

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: VR.bg,
        borderTop: `1px solid ${VR.border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 20px rgba(22,29,20,0.08)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          maxWidth: 440,
          margin: '0 auto',
          height: 64,
        }}>
          {TABS.map(tab => {
            const active = isActive(tab)
            const isReview = tab.id === 'review'

            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.href)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '8px 0',
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Active indicator — top bar */}
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    borderRadius: '0 0 2px 2px',
                    background: VR.accent,
                  }} />
                )}

                {/* Icon + badge */}
                <div style={{ position: 'relative', lineHeight: 1 }}>
                  <span style={{
                    fontSize: active ? 20 : 18,
                    transition: 'font-size 0.15s',
                    filter: active ? 'none' : 'grayscale(40%) opacity(0.6)',
                  }}>
                    {tab.icon}
                  </span>

                  {/* Review badge */}
                  {isReview && reviewCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      background: '#A0302A',
                      color: '#FFFFFF',
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono',monospace",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      border: '1.5px solid #FFFFFF',
                      lineHeight: 1,
                    }}>
                      {reviewCount > 9 ? '9+' : reviewCount}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  fontFamily: VR.display,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: active ? VR.accent : VR.muted,
                  transition: 'color 0.15s',
                  lineHeight: 1,
                }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
