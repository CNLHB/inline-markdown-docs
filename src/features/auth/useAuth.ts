import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client'

type AuthState = {
  user: User | null
  loading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; code?: string; requiresEmailConfirmation?: boolean }>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; code?: string; requiresEmailConfirmation?: boolean }>
  resendConfirmation: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveRedirectTo = () => {
    const envRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL
    if (envRedirect) return envRedirect
    if (typeof window !== 'undefined') return window.location.origin
    return undefined
  }

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
    return { error: error?.message, code: error?.code, requiresEmailConfirmation: undefined }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const emailRedirectTo = resolveRedirectTo()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    })
    const requiresEmailConfirmation = Boolean(data?.user && !data?.session)
    return { error: error?.message, code: error?.code, requiresEmailConfirmation }
  }, [])

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const emailRedirectTo = resolveRedirectTo()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    })
    return { error: error?.message }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return { user, loading, signIn, signUp, resendConfirmation, signOut }
}
