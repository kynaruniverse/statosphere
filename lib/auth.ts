import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profile)
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (!session?.user) setProfile(null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isOnboarded: !!profile?.onboarding_complete,
  }
}