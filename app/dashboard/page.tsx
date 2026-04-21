'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      setProfile(profile)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      {profile && (
        <div>
          <p>Confidence: {profile.confidence}</p>
          <p>Focus: {profile.focus}</p>
          <p>Fitness: {profile.fitness}</p>
        </div>
      )}
    </div>
  )
}