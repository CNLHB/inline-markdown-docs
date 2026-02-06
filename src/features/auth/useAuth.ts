import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client'

type AuthState = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser({ id: 'local-user' } as User)
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return { user, loading, signIn, signUp, signOut }
}
