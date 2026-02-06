import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuth } from './useAuth'

type AuthGateProps = {
  children: (userId: string) => ReactNode
}

const AuthGate = ({ children }: AuthGateProps) => {
  const { t } = useTranslation()
  const { user, loading, signIn, signUp, resendConfirmation } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)

  if (!isSupabaseConfigured) {
    return <>{children('local-user')}</>
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">{t('messages.loadingWorkspace')}</div>
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
            setInfo(null)
            const action = isSignup ? signUp : signIn
            const { error: message, code, requiresEmailConfirmation } = await action(
              email,
              password,
            )
            if (message) {
              const resolved =
                code === 'invalid_credentials' ? t('auth.invalidCredentials') : message
              setError(resolved)
              setShowResend(code === 'invalid_credentials')
              return
            }
            if (requiresEmailConfirmation) {
              setInfo(t('auth.confirmationSent', { email }))
              setShowResend(true)
            }
          }}
        >
          <div className="auth-title">{t('auth.title')}</div>
          <p className="auth-subtitle">
            {isSignup ? t('auth.createSubtitle') : t('auth.signInSubtitle')}
          </p>
          <label className="field">
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@studio.com"
              required
            />
          </label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
            />
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-info">{info}</div> : null}
          {showResend ? <div className="auth-hint">{t('auth.emailHint')}</div> : null}
          {showResend ? (
            <button
              type="button"
              className="ghost-btn"
              disabled={resending || !email}
              onClick={async () => {
                if (!email) return
                setResending(true)
                setError(null)
                setInfo(null)
                const { error: resendError } = await resendConfirmation(email)
                if (resendError) {
                  setError(resendError)
                } else {
                  setInfo(t('auth.resendSuccess', { email }))
                }
                setResending(false)
              }}
            >
              {resending ? t('auth.resending') : t('auth.resendConfirmation')}
            </button>
          ) : null}
          <button type="submit" className="primary-btn">
            {isSignup ? t('auth.createAccount') : t('auth.signIn')}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setIsSignup((value) => !value)
              setShowResend(false)
              setError(null)
              setInfo(null)
            }}
          >
            {isSignup ? t('auth.haveAccount') : t('auth.needAccount')}
          </button>
        </form>
      </div>
    )
  }

  return <>{children(user.id)}</>
}

export default AuthGate
