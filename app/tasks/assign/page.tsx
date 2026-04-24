'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

type StatCategory = { id: string; name: string; icon: string }
type Member = { id: string; member_id: string; profiles: { id: string; full_name: string | null; username: string | null } }

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 16px',
  border: `1.5px solid ${VR.border}`, borderRadius: 10,
  fontSize: 14, color: VR.text, background: VR.card,
  outline: 'none', boxSizing: 'border-box', fontFamily: VR.body,
  transition: 'border-color 0.15s',
}

export default function AssignTaskPage() {
  const router = useRouter()

  const [categories, setCategories] = useState<StatCategory[]>([])
  const [members, setMembers]       = useState<Member[]>([])
  const [assignableUsers, setAssignable] = useState<{ id: string; label: string }[]>([])

  const [selectedUser, setSelectedUser]   = useState('')
  const [selectedStat, setSelectedStat]   = useState('')
  const [title, setTitle]                 = useState('')
  const [description, setDescription]     = useState('')
  const [loading, setLoading]             = useState(false)
  const [pageLoading, setPageLoading]     = useState(true)
  const [success, setSuccess]             = useState(false)
  const [userId, setUserId]               = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const [{ data: cats }, { data: council }] = await Promise.all([
        supabase.from('stat_categories').select('*').order('name'),
        supabase.from('councils').select('id').eq('owner_id', user.id).single(),
      ])

      if (cats) setCategories(cats)

      // Build assignable list: self + active council members
      const list: { id: string; label: string }[] = [
        { id: user.id, label: 'Myself' },
      ]

      if (council) {
        const { data: membersData } = await supabase
          .from('council_members')
          .select('id, member_id, profiles(id, full_name, username)')
          .eq('council_id', council.id)
          .eq('status', 'active')
        if (membersData) {
          setMembers(membersData as Member[])
          membersData.forEach((m: any) => {
            if (m.member_id !== user.id) {
              list.push({
                id: m.member_id,
                label: m.profiles?.full_name || `@${m.profiles?.username}` || 'Member',
              })
            }
          })
        }
      }

      setAssignable(list)
      if (list.length > 0) setSelectedUser(list[0].id)
      setPageLoading(false)
    }
    load()
  }, [router])

  const handleAssign = async () => {
    if (!title.trim() || !selectedStat || !selectedUser) return
    setLoading(true)

    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      stat_category_id: selectedStat,
      assigned_to: selectedUser,
      assigned_by: userId,
      status: 'active',
    })

    if (!error) {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1800)
    }
    setLoading(false)
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    fontFamily: VR.display, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: VR.muted, marginBottom: 7,
  }

  if (pageLoading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  if (success) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: VR.body }}>
      <p style={{ fontSize: 36 }}>⚔️</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: VR.display, color: VR.text, letterSpacing: '0.04em' }}>Challenge Issued</p>
      <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic' }}>Returning to your build...</p>
    </main>
  )

  const canSubmit = title.trim() && selectedStat && selectedUser

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 80px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        <PageHeader title="Assign Task" backHref="/dashboard" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Assign to */}
          <div>
            <label style={labelStyle}>Assign to</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              style={{ ...inputStyle }}
              onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = VR.border }}
            >
              {assignableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>

          {/* Stat */}
          <div>
            <label style={labelStyle}>Stat to train</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedStat(cat.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${selectedStat === cat.id ? VR.accent : VR.border}`,
                    background: selectedStat === cat.id ? VR.accentMuted : VR.surface,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: VR.body,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{
                    fontSize: 12, fontWeight: selectedStat === cat.id ? 700 : 500,
                    color: selectedStat === cat.id ? VR.accent : VR.text,
                    fontFamily: VR.display, letterSpacing: '0.04em',
                  }}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Task title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Run 5km without stopping"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = VR.border }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', fontSize: 11 }}>(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any extra context, rules, or expectations..."
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = VR.border }}
            />
          </div>

          <button
            onClick={handleAssign}
            disabled={!canSubmit || loading}
            style={{
              width: '100%', padding: '14px 20px',
              background: VR.accent, color: '#FFFFFF',
              border: 'none', borderRadius: 12,
              fontSize: 12, fontWeight: 700, fontFamily: VR.display,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: (!canSubmit || loading) ? 'not-allowed' : 'pointer',
              opacity: (!canSubmit || loading) ? 0.5 : 1,
              boxShadow: `0 2px 12px ${VR.accent}30`,
            }}>
            {loading ? 'Issuing...' : 'Issue Challenge →'}
          </button>

        </div>
      </div>
    </main>
  )
}
