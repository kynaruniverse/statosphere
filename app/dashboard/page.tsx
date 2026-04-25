'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatBar from '@/components/StatBar'
import EmptyState from '@/components/EmptyState'
import { getDaysUntilCycleEnd, getCycleLabel, getCycleUrgencyColor, getStreakFlame } from '@/lib/cycle'
import type { Profile, UserStat, Streak, Task } from '@/lib/types'

// ── Verdant Ruin helpers ──────────────────────────────────────────────────────

const VR = {
  bg:          '#EBF0E5',
  surface:     '#DDE5D5',
  card:        '#FFFFFF',
  border:      '#C4D0B8',
  borderDeep:  '#A8BCA0',
  text:        '#161D14',
  muted:       '#627056',
  accent:      '#2D6A3F',
  accentMuted: '#D0E8D8',
  gold:        '#6B8C3A',
  goldBg:      '#E8F0D4',
  approved:    '#2D6A3F',
  rejected:    '#A0302A',
  pending:     '#7A6020',
  pendingBg:   '#F0E4C0',
  display:     "'Cinzel', 'Times New Roman', serif",
  body:        "'Spectral', 'Georgia', serif",
  mono:        "'JetBrains Mono', 'Courier New', monospace",
}

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  approved:   { label: '✓ Approved',    color: VR.approved, bg: VR.accentMuted },
  rejected:   { label: '✗ Rejected',    color: VR.rejected, bg: '#F5DADA' },
  needs_more: { label: '→ Needs More',  color: VR.pending,  bg: VR.pendingBg },
  pending:    { label: '◌ Awaiting',    color: VR.muted,    bg: VR.surface },
  active:     { label: 'Active',        color: VR.accent,   bg: VR.accentMuted },
}

function Badge({ status }: { status: string }) {
  const s = statusMeta[status] ?? { label: status, color: VR.muted, bg: VR.surface }
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      fontFamily: VR.display,
      padding: '3px 8px',
      borderRadius: 4,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.color}30`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function Divider({ label }: { label?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '4px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: VR.border }} />
      {label && (
        <span style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: VR.muted,
          fontFamily: VR.display,
        }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: VR.border }} />
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CouncilMember = {
  id: string
  member_id: string | null
  invite_email: string | null
  status: 'pending' | 'active' | 'removed'
  profiles?: { full_name: string | null; username: string | null } | null
}

type PendingXP = {
  id: string
  delta: number
  stat_category_id: string
  stat_categories?: { name: string; icon: string } | null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [profile, setProfile]           = useState<Profile | null>(null)
  const [userStats, setUserStats]       = useState<UserStat[]>([])
  const [streaks, setStreaks]           = useState<Streak[]>([])
  const [activeTasks, setActiveTasks]  = useState<Task[]>([])
  const [councilMembers, setCouncil]   = useState<CouncilMember[]>([])
  const [pendingXP, setPendingXP]      = useState<PendingXP[]>([])
  const [loading, setLoading]          = useState(true)
  const [userId, setUserId]            = useState('')
  const [councilId, setCouncilId]      = useState('')

  const daysLeft    = getDaysUntilCycleEnd()
  const cycleLabel  = getCycleLabel()
  const urgency     = getCycleUrgencyColor(daysLeft)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          router.replace('/')
          return
        }

        const user = session.user
        setUserId(user.id)

        const [
          { data: profileData, error: profileError },
          { data: statsData, error: statsError },
          { data: streaksData, error: streaksError },
          { data: tasksData, error: tasksError },
          { data: councilData, error: councilError },
          { data: pendingData, error: pendingError },
        ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_stats').select('*, stat_categories(*)').eq('user_id', user.id),
        supabase.from('streaks').select('*').eq('user_id', user.id),
        supabase.from('tasks')
          .select('*, stat_categories(*), assigner:profiles!tasks_assigned_by_fkey(id, full_name, username)')
          .eq('assigned_to', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase.from('councils').select('id').eq('owner_id', user.id).maybeSingle(),
        supabase.from('pending_stat_changes')
          .select('*, stat_categories(name, icon)')
          .eq('user_id', user.id)
          .eq('applied', false),
      ])

      if (!profileData) {
        router.replace('/onboarding')
        return
      }

      if (!profileData.onboarding_complete) {
        router.replace('/onboarding')
        return
      }

      setProfile(profileData)
      setUserStats(statsData || [])
      setStreaks(streaksData || [])
      setActiveTasks(tasksData || [])
      setPendingXP(pendingData || [])

      if (councilData) {
        setCouncilId(councilData.id)
        const { data: members } = await supabase
          .from('council_members')
          .select('*, profiles(full_name, username)')
          .eq('council_id', councilData.id)
          .neq('status', 'removed')
          .order('status', { ascending: true })
        setCouncil(members || [])
      }

      setLoading(false)
        } catch (err) {
          console.error('Dashboard load crash:', err)
          router.replace('/')
        }
      }
      load()
  }, [router])

  const getStreakForStat = (statCategoryId: string) =>
    streaks.find(s => s.stat_category_id === statCategoryId)

  const totalXP = userStats.reduce((sum, s) => sum + (s.current_value || 0), 0)
  const pendingTotal = pendingXP.reduce((sum, p) => sum + p.delta, 0)
  const activeCount = councilMembers.filter(m => m.status === 'active').length
  const topStat = userStats.reduce<UserStat | null>(
    (top, s) => (!top || s.current_value > top.current_value) ? s : top, null
  )

  // ── Spinner ─────────────────────────────────────────────────────────────────
  if (loading || !profile) {
    return (
      <main style={{
        minHeight: '100svh',
        background: VR.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `2px solid ${VR.border}`,
          borderTopColor: VR.accent,
          animation: 'spin 0.85s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: '100svh',
      background: VR.bg,
      fontFamily: VR.body,
    }}>

      {/* Ambient moss texture — very subtle */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: `radial-gradient(ellipse 70% 60% at 80% 10%, rgba(45,106,63,0.05) 0%, transparent 70%)`,
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 440,
        margin: '0 auto',
        padding: '0 20px 80px',
      }}>

        {/* ══════════════════════════════════════════════
            NAV BAR
        ══════════════════════════════════════════════ */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          paddingBottom: 20,
          marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${VR.accent} 0%, ${VR.gold} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: VR.display,
              fontWeight: 900,
              fontSize: 14,
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${VR.accent}30`,
            }}>
              S
            </div>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontFamily: VR.display,
              color: VR.muted,
            }}>
              Statosphere
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href={`/u/${profile?.username}`}
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: VR.display,
                letterSpacing: '0.08em',
                color: VR.muted,
                textDecoration: 'none',
                padding: '5px 10px',
                border: `1px solid ${VR.border}`,
                borderRadius: 6,
                background: VR.card,
              }}>
              View Build
            </Link>
            <Link
              href="/settings"
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: VR.display,
                letterSpacing: '0.08em',
                color: VR.muted,
                textDecoration: 'none',
                padding: '5px 10px',
                border: `1px solid ${VR.border}`,
                borderRadius: 6,
                background: VR.card,
              }}>
              ⚙
            </Link>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════
            CHARACTER HEADER
        ══════════════════════════════════════════════ */}
        <div style={{
          background: VR.card,
          border: `1px solid ${VR.border}`,
          borderRadius: 16,
          padding: '20px 20px 0',
          marginBottom: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(22,29,20,0.06)',
        }}>

          {/* Top row: name + level */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <div>
              <p style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: VR.accent,
                fontFamily: VR.display,
                marginBottom: 4,
              }}>
                Your Build
              </p>
              <h1 style={{
                fontSize: 22,
                fontWeight: 700,
                color: VR.text,
                fontFamily: VR.display,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                margin: 0,
              }}>
                @{profile?.username}
              </h1>
              {profile?.full_name && (
                <p style={{
                  fontSize: 12,
                  color: VR.muted,
                  fontStyle: 'italic',
                  marginTop: 2,
                }}>
                  {profile.full_name}
                </p>
              )}
            </div>

            {/* XP badge */}
            <div style={{
              background: VR.surface,
              border: `1px solid ${VR.border}`,
              borderRadius: 10,
              padding: '8px 12px',
              textAlign: 'center',
              minWidth: 64,
            }}>
              <p style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: VR.mono,
                color: VR.accent,
                lineHeight: 1,
                margin: 0,
              }}>
                {totalXP}
              </p>
              <p style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: VR.muted,
                fontFamily: VR.display,
                marginTop: 3,
              }}>
                Total XP
              </p>
            </div>
          </div>

          {/* Becoming statement */}
          {profile?.becoming_statement && (
            <div style={{
              padding: '12px 14px',
              margin: '0 -20px',
              background: VR.surface,
              borderTop: `1px solid ${VR.border}`,
            }}>
              <p style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: VR.muted,
                fontFamily: VR.display,
                marginBottom: 4,
              }}>
                Becoming
              </p>
              <p style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: VR.text,
                fontStyle: 'italic',
                margin: 0,
              }}>
                "{profile.becoming_statement}"
              </p>
            </div>
          )}

          {/* Cycle bar */}
          <div style={{
            margin: '0 -20px',
            padding: '10px 20px',
            background: VR.goldBg,
            borderTop: `1px solid ${VR.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11 }}>⏳</span>
              <span style={{
                fontSize: 10,
                fontFamily: VR.display,
                fontWeight: 700,
                color: VR.text,
                letterSpacing: '0.06em',
              }}>
                {cycleLabel}
              </span>
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: VR.mono,
              color: daysLeft <= 1 ? '#A0302A' : daysLeft <= 3 ? VR.pending : VR.gold,
              letterSpacing: '0.05em',
            }}>
              {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
            </span>
          </div>

        </div>

        {/* ── Pending XP banner ── */}
        {pendingTotal > 0 && (
          <div style={{
            background: VR.accentMuted,
            border: `1px solid ${VR.accent}40`,
            borderRadius: 12,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 12,
              fontFamily: VR.display,
              fontWeight: 700,
              color: VR.accent,
              letterSpacing: '0.04em',
            }}>
              ✦ Pending XP this cycle
            </span>
            <span style={{
              fontSize: 14,
              fontFamily: VR.mono,
              fontWeight: 700,
              color: VR.accent,
            }}>
              +{pendingTotal}
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STAT GAUGES
        ══════════════════════════════════════════════ */}
        <div style={{
          background: VR.card,
          border: `1px solid ${VR.border}`,
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 16px rgba(22,29,20,0.06)',
        }}>

          {/* Section header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}>
            <p style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: VR.muted,
              fontFamily: VR.display,
              margin: 0,
            }}>
              Build Stats
            </p>
            {topStat && (
              <span style={{
                fontSize: 10,
                fontFamily: VR.display,
                fontWeight: 600,
                color: VR.gold,
                letterSpacing: '0.05em',
              }}>
                ★ {(topStat as any).stat_categories?.name}
              </span>
            )}
          </div>

          {userStats.length === 0 ? (
            <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
              No stats yet — complete the onboarding to begin.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {userStats.map((stat, i) => {
                const streak = getStreakForStat(stat.stat_category_id)
                return (
                  <div key={stat.id}>
                    {i > 0 && <div style={{ height: 1, background: VR.surface, marginBottom: 18 }} />}
                    <StatBar
                      icon={(stat as any).stat_categories?.icon || ''}
                      name={(stat as any).stat_categories?.name || ''}
                      value={stat.current_value}
                      streak={streak?.current_streak || 0}
                      showStreak={true}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            ACTIVE TASKS
        ══════════════════════════════════════════════ */}
        <div style={{
          background: VR.card,
          border: `1px solid ${VR.border}`,
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 16px rgba(22,29,20,0.06)',
        }}>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: VR.muted,
              fontFamily: VR.display,
              margin: 0,
            }}>
              Active Tasks
            </p>
            <span style={{
              fontSize: 10,
              fontFamily: VR.mono,
              fontWeight: 700,
              color: activeTasks.length > 0 ? VR.accent : VR.muted,
            }}>
              {activeTasks.length}
            </span>
          </div>

          {activeTasks.length === 0 ? (
            <EmptyState
              icon="⚔️"
              title="No active tasks."
              description="Your Council will assign challenges here each week."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeTasks.map(task => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    padding: '14px 16px',
                    border: `1px solid ${VR.border}`,
                    borderRadius: 10,
                    background: VR.surface,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 5,
                      }}>
                        <span style={{ fontSize: 12 }}>
                          {(task as any).stat_categories?.icon}
                        </span>
                        <span style={{
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: VR.muted,
                          fontFamily: VR.display,
                        }}>
                          {(task as any).stat_categories?.name}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: VR.text,
                        lineHeight: 1.4,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 220,
                      }}>
                        {task.title}
                      </p>
                      {(task as any).assigner && (
                        <p style={{
                          fontSize: 11,
                          color: VR.muted,
                          marginTop: 3,
                          fontStyle: 'italic',
                        }}>
                          from {(task as any).assigner.full_name || '@' + (task as any).assigner.username}
                        </p>
                      )}
                    </div>
                    <Badge status="active" />
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════
            COUNCIL
        ══════════════════════════════════════════════ */}
        <div style={{
          background: VR.card,
          border: `1px solid ${VR.border}`,
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 16px rgba(22,29,20,0.06)',
        }}>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: VR.muted,
              fontFamily: VR.display,
              margin: 0,
            }}>
              The Council
            </p>
            <Link
              href="/council"
              style={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: VR.display,
                letterSpacing: '0.1em',
                color: VR.accent,
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}>
              Manage →
            </Link>
          </div>

          {/* Council slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {councilMembers.length === 0 ? (
              <EmptyState
                icon="🛡️"
                title="No council members yet."
                description="Invite trusted people to hold you accountable."
                action={{ label: 'Invite members', href: '/council' }}
              />
            ) : (
              councilMembers.map(m => {
                const name = m.profiles?.full_name
                  || (m.profiles?.username ? `@${m.profiles.username}` : null)
                  || m.invite_email
                  || 'Invited'
                return (
                  <div key={m.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: m.status === 'active' ? VR.surface : 'transparent',
                    border: `1px solid ${m.status === 'active' ? VR.border : VR.border}`,
                    borderStyle: m.status === 'pending' ? 'dashed' : 'solid',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Avatar circle */}
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: m.status === 'active'
                          ? `linear-gradient(135deg, ${VR.accent}, ${VR.gold})`
                          : VR.surface,
                        border: `1px solid ${VR.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: VR.display,
                        color: m.status === 'active' ? '#FFFFFF' : VR.muted,
                        flexShrink: 0,
                      }}>
                        {m.status === 'active'
                          ? (name?.charAt(0).toUpperCase() || '?')
                          : '?'}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: m.status === 'active' ? VR.text : VR.muted,
                        fontStyle: m.status === 'pending' ? 'italic' : 'normal',
                      }}>
                        {name}
                      </span>
                    </div>
                    <Badge status={m.status === 'active' ? 'active' : 'pending'} />
                  </div>
                )
              })
            )}
          </div>

          {/* Seat count */}
          <Divider />
          <p style={{
            textAlign: 'center',
            fontSize: 11,
            color: VR.muted,
            fontFamily: VR.display,
            marginTop: 10,
            letterSpacing: '0.06em',
          }}>
            {activeCount} / 5 seats filled
          </p>

        </div>

        {/* ══════════════════════════════════════════════
            BOTTOM ACTIONS
        ══════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}>
          <Link
            href="/activity"
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              padding: '14px 16px',
              background: VR.card,
              border: `1px solid ${VR.border}`,
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 1px 6px rgba(22,29,20,0.05)',
            }}>
              <p style={{
                fontSize: 18,
                marginBottom: 4,
              }}>📋</p>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: VR.display,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: VR.text,
                marginBottom: 2,
              }}>
                Activity
              </p>
              <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>
                Council decisions
              </p>
            </div>
          </Link>

          <Link
            href="/tasks/assign"
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              padding: '14px 16px',
              background: VR.accent,
              border: `1px solid ${VR.accent}`,
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: `0 2px 12px ${VR.accent}30`,
            }}>
              <p style={{ fontSize: 18, marginBottom: 4 }}>⚔️</p>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: VR.display,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                marginBottom: 2,
              }}>
                Assign Task
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                Issue a challenge
              </p>
            </div>
          </Link>
        </div>

        {/* Review link — only shown if there are reviews to do */}
        <Link
          href="/review"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div style={{
            padding: '14px 20px',
            background: VR.card,
            border: `1px solid ${VR.border}`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 6px rgba(22,29,20,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚖️</span>
              <div>
                <p style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: VR.display,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: VR.text,
                  marginBottom: 1,
                }}>
                  Council Reviews
                </p>
                <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>
                  Judge submissions from your seat
                </p>
              </div>
            </div>
            <span style={{ fontSize: 16, color: VR.muted }}>›</span>
          </div>
        </Link>

      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes vrShimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>

    </main>
  )
}
