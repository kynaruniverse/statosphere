'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { StatCategory } from '@/lib/types'
import Link from 'next/link'

type CouncilOption = {
  id: string
  name: string
  role: 'owner' | 'member'
  owner_id: string
}

type MemberOption = {
  id: string
  full_name: string | null
  username: string | null
}

export default function AssignTaskPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [stats, setStats] = useState<StatCategory[]>([])
  const [councils, setCouncils] = useState<CouncilOption[]>([])
  const [selectedCouncil, setSelectedCouncil] = useState<string>('')
  const [selectedStat, setSelectedStat] = useState<string>('')
  const [assignTo, setAssignTo] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [councilMembers, setCouncilMembers] = useState<MemberOption[]>([])
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: statsData } = await supabase
        .from('stat_categories')
        .select('*')
        .order('name')
      if (statsData) setStats(statsData)

      const { data: memberOf } = await supabase
        .from('council_members')
        .select('council_id, councils(id, name, owner_id)')
        .eq('member_id', user.id)
        .eq('status', 'active')

      const { data: ownedCouncil } = await supabase
        .from('councils')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      const allCouncils: CouncilOption[] = []

      if (ownedCouncil) {
        allCouncils.push({
          id: ownedCouncil.id,
          name: ownedCouncil.name,
          owner_id: ownedCouncil.owner_id,
          role: 'owner'
        })
      }

      if (memberOf) {
        memberOf.forEach((m: any) => {
          if (m.councils) {
            allCouncils.push({
              id: m.councils.id,
              name: m.councils.name,
              owner_id: m.councils.owner_id,
              role: 'member'
            })
          }
        })
      }

      setCouncils(allCouncils)
      if (allCouncils.length > 0) setSelectedCouncil(allCouncils[0].id)
      setPageLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedCouncil) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const council = councils.find(c => c.id === selectedCouncil)
      if (!council) return

      const members: MemberOption[] = []

      if (council.role === 'owner') {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', user.id)
          .single()
        if (ownerProfile) members.push(ownerProfile)

        const { data: councilMembersData } = await supabase
          .from('council_members')
          .select('member_id, profiles(id, full_name, username)')
          .eq('council_id', selectedCouncil)
          .eq('status', 'active')

        if (councilMembersData) {
          councilMembersData.forEach((m: any) => {
            if (m.profiles) members.push(m.profiles)
          })
        }
      } else {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', council.owner_id)
          .single()
        if (ownerProfile) members.push(ownerProfile)
      }

      setCouncilMembers(members)
      if (members.length > 0) setAssignTo(members[0].id)
    }
    loadMembers()
  }, [selectedCouncil, councils])

  const handleSubmit = async () => {
    if (!selectedCouncil || !assignTo || !selectedStat || !title.trim()) return
    setLoading(true)

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (7 - dueDate.getDay()))
    dueDate.setHours(23, 59, 59, 0)

    const res = await fetch('/api/create-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        council_id: selectedCouncil,
        assigned_to: assignTo,
        stat_category_id: selectedStat,
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate.toISOString(),
      }),
    })

    const data = await res.json()
    if (data.success) setSuccess(true)
    setLoading(false)
  }

  const canSubmit = selectedCouncil && assignTo && selectedStat && title.trim().length > 3

  if (success) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-xs tracking-[0.3em] uppercase"
          style={{ color: '#7C3AED' }}>TASK ASSIGNED</p>
        <h1 className="text-3xl font-black" style={{ color: '#F1F5F9' }}>
          Challenge sent.
        </h1>
        <p style={{ color: '#64748B' }}>The task is now live and waiting.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSuccess(false); setTitle(''); setDescription('') }}
            className="px-6 py-3 rounded-xl font-bold text-sm border"
            style={{ borderColor: '#2D3158', color: '#64748B' }}>
            Assign Another
          </button>
          <Link href="/dashboard"
            className="px-6 py-3 rounded-xl font-bold text-sm"
            style={{ backgroundColor: '#7C3AED', color: '#F1F5F9' }}>
            Dashboard →
          </Link>
        </div>
      </div>
    </main>
  )

  if (pageLoading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0F1117' }}>
      <p style={{ color: '#64748B' }}>Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.3em] uppercase"
              style={{ color: '#7C3AED' }}>STATOSPHERE</p>
            <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>
              Assign a Task
            </h1>
          </div>
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded-xl border"
            style={{ borderColor: '#2D3158', color: '#64748B' }}>
            ← Back
          </Link>
        </div>

        <div className="space-y-5">

          {councilMembers.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: '#64748B' }}>
                Assign to
              </label>
              <select
                value={assignTo}
                onChange={e => setAssignTo(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl text-base outline-none border"
                style={{
                  backgroundColor: '#1B1F3B',
                  borderColor: '#2D3158',
                  color: '#F1F5F9',
                }}>
                {councilMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.username || 'Member'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#64748B' }}>
              Which stat does this build?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {stats.map(stat => (
                <button
                  key={stat.id}
                  onClick={() => setSelectedStat(stat.id)}
                  className="p-3 rounded-xl text-left border transition-all"
                  style={{
                    backgroundColor: selectedStat === stat.id ? '#7C3AED' : '#1B1F3B',
                    borderColor: selectedStat === stat.id ? '#7C3AED' : '#2D3158',
                  }}>
                  <span className="text-lg">{stat.icon}</span>
                  <p className="text-sm font-bold mt-1" style={{ color: '#F1F5F9' }}>
                    {stat.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#64748B' }}>
              Task title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Start a conversation with a stranger"
              className="w-full px-4 py-4 rounded-2xl text-base outline-none border"
              style={{
                backgroundColor: '#1B1F3B',
                borderColor: title.length > 3 ? '#7C3AED' : '#2D3158',
                color: '#F1F5F9',
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#64748B' }}>
              Details <span style={{ color: '#2D3158' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Give context, rules, or requirements..."
              rows={3}
              className="w-full px-4 py-4 rounded-2xl text-base outline-none
                border resize-none"
              style={{
                backgroundColor: '#1B1F3B',
                borderColor: '#2D3158',
                color: '#F1F5F9',
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-base
              tracking-wide transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: '#A3E635', color: '#0F1117' }}>
            {loading ? 'Assigning...' : 'Assign Challenge →'}
          </button>

        </div>
      </div>
    </main>
  )
}