import { useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuth } from './useAuth'

type AuthGateProps = {
  children: (userId: string) => React.ReactNode
}

const AuthGate = ({ children }: AuthGateProps) => {
  const { user, loading, signIn, signUp } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isSupabaseConfigured) {
    return <>{children('local-user')}</>
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">Loading workspace…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <form
          className="auth-card"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            const action = isSignup ? signUp : signIn
            const { error: message } = await action(email, password)
            if (message) setError(message)
          }}
        >
          <div className="auth-title">Inkline Workspace</div>
          <p className="auth-subtitle">
            {isSignup ? 'Create your account' : 'Sign in to sync your notes'}
          </p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@studio.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          <button type="submit" className="primary-btn">
            {isSignup ? 'Create account' : 'Sign in'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setIsSignup((value) => !value)}
          >
            {isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </form>
      </div>
    )
  }

  return <>{children(user.id)}</>
}

export default AuthGate
