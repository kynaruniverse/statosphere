'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CouncilRequest } from '@/lib/types'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'

export default function RequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<CouncilRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('council_requests')
        .select('*, profiles!council_requests_requester_id_fkey(id, full_name, username, becoming_statement)')
        .eq('target_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (data) setRequests(data as CouncilRequest[])
      setLoading(false)
    }
    load()
  }, [router])

  const handleAccept = async (requestId: string) => {
    setActing(requestId)
    setActionError('')

    const res = await fetch('/api/accept-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    })

    const data = await res.json()

    if (data.success) {
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } else {
      setActionError(data.error || 'Something went wrong')
    }

    setActing(null)
  }

  const handleDecline = async (requestId: string) => {
    setActing(requestId)
    setActionError('')

    const { error } = await supabase
      .from('council_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)

    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== requestId))
    }

    setActing(null)
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0F1117' }}>
      <p style={{ color: '#64748B' }}>Loading requests...</p>
    </main>
  )

  return (
    <main className="min-h-screen px-6 py-12"
      style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md mx-auto space-y-8">

        <PageHeader title="Council Requests" backHref="/dashboard" />

        {actionError && (
          <div className="p-3 rounded-xl"
            style={{ backgroundColor: '#1B1F3B', borderLeft: '3px solid #EF4444' }}>
            <p className="text-sm" style={{ color: '#EF4444' }}>{actionError}</p>
          </div>
        )}

        {requests.length === 0 ? (
          <EmptyState
            icon="🪑"
            title="No pending requests."
            description="When someone requests a seat on your Council, they'll appear here."
          />
        ) : (
          <div className="space-y-4">
            <p className="text-xs tracking-widest uppercase"
              style={{ color: '#64748B' }}>
              PENDING — {requests.length}
            </p>

            {requests.map(req => (
              <div key={req.id}
                className="p-4 rounded-2xl border space-y-4"
                style={{ backgroundColor: '#1B1F3B', borderColor: '#2D3158' }}>

                <div className="space-y-1">
                  <p className="font-black" style={{ color: '#F1F5F9' }}>
                    @{req.profiles?.username}
                  </p>
                  {req.profiles?.full_name && (
                    <p className="text-sm" style={{ color: '#64748B' }}>
                      {req.profiles.full_name}
                    </p>
                  )}
                  {req.profiles?.becoming_statement && (
                    <p className="text-xs leading-relaxed pt-1 italic"
                      style={{ color: '#64748B' }}>
                      "{req.profiles.becoming_statement}"
                    </p>
                  )}
                </div>

                {req.message && (
                  <div className="p-3 rounded-xl"
                    style={{ backgroundColor: '#0F1117' }}>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>
                      THEIR MESSAGE
                    </p>
                    <p className="text-sm" style={{ color: '#F1F5F9' }}>
                      "{req.message}"
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecline(req.id)}
                    disabled={acting === req.id}
                    className="flex-1 py-3 rounded-xl font-bold text-sm border
                      transition-all active:scale-95 disabled:opacity-40"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={acting === req.id}
                    className="flex-1 py-3 rounded-xl font-bold text-sm
                      transition-all active:scale-95 disabled:opacity-40"
                    style={{ backgroundColor: '#A3E635', color: '#0F1117' }}>
                    {acting === req.id ? 'Adding...' : 'Accept →'}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}