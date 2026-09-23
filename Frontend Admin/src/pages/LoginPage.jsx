import { Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAuthFeaturesApi, resendLoginOtpApi } from '../services/authApi'
import { useAuthStore } from '../store/authStore'
import { isFirebaseConfigured } from '../config/firebase'
import { getWebsiteUrl } from '../utils/websiteUrl'

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.4-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.4-4l-3.2 2.5C5.1 19.9 8.3 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.6 14.1c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.4 7.8C2.7 9.1 2.3 10.5 2.3 12s.4 2.9 1.1 4.2l3.2-2.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.8 2.8 14.6 2 12 2 8.3 2 5.1 4.1 3.4 7.8l3.2 2.5c.7-2.3 2.9-4.5 5.4-4.5z"
      />
    </svg>
  )
}

function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  const verifyLoginOtp = useAuthStore((state) => state.verifyLoginOtp)
  const loading = useAuthStore((state) => state.isLoading)

  const featuresQuery = useQuery({
    queryKey: ['auth-features'],
    queryFn: fetchAuthFeaturesApi,
    staleTime: 60_000,
  })
  const googleEnabled =
    featuresQuery.data?.google_auth_enabled === true && isFirebaseConfigured()

  console.log("google_auth_enabled",featuresQuery.data?.google_auth_enabled);
  console.log("isFirebaseConfigured",isFirebaseConfigured())

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('signup') === 'success') {
      setSignupSuccess(true)
      const email = params.get('email')
      if (email) {
        setIdentifier(email)
      }
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    try {
      const result = await login({
        email: identifier,
        password,
        rememberMe,
      })

      if (result?.requires_otp) {
        setOtpStep(true)
        setChallengeToken(result.challenge_token || '')
        setOtpEmail(result.email || identifier)
        setOtpCode('')
        setSignupSuccess(false)
      }
    } catch (error) {
      setSubmitError(error.message || 'Unable to login')
    }
  }

  const handleGoogleLogin = async () => {
    if (googleLoading || loading) return
    setSubmitError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle({ rememberMe })
      setSignupSuccess(false)
    } catch (error) {
      if (error?.code === 'ACCOUNT_NOT_FOUND' || error?.status === 404) {
        setSubmitError(
          'No account found for this Google email. Register on the website first, then sign in here.',
        )
      } else {
        setSubmitError(error.message || 'Unable to sign in with Google')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleOtpSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    const code = otpCode.trim()
    if (!/^\d{6}$/.test(code)) {
      setSubmitError('Enter the 6-digit code from your email.')
      return
    }

    try {
      await verifyLoginOtp({
        challengeToken,
        code,
        email: otpEmail || identifier,
        rememberMe,
      })
    } catch (error) {
      setSubmitError(error.message || 'Unable to verify code')
    }
  }

  const handleResendOtp = async () => {
    setSubmitError('')
    setResending(true)
    try {
      await resendLoginOtpApi({ challenge_token: challengeToken })
      setOtpCode('')
    } catch (error) {
      setSubmitError(error.message || 'Unable to resend code')
    } finally {
      setResending(false)
    }
  }

  const busy = loading || googleLoading

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(27,75,107,0.12),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(200,35,44,0.06),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(27,75,107,0.08),transparent_40%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-navy-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 right-8 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-6 h-64 w-64 rounded-full bg-navy-500/15 blur-3xl" />

      <section className="glass-card relative w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src="/log5.png"
              alt="Company logo"
              className="h-16 w-auto max-w-[220px] object-contain sm:h-20"
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-700">
            Host Portal
          </p>
          <p className="text-sm text-slate-600">
            {otpStep
              ? `Enter the 6-digit code sent to ${otpEmail || identifier}.`
              : 'Sign in to manage your quiz, poll, and survey sessions.'}
          </p>
        </div>

        {signupSuccess && !otpStep ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Account created successfully. Sign in with Google or with the email and password you
            registered.
          </div>
        ) : null}

        {otpStep ? (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="otpCode" className="text-sm font-medium text-slate-700">
                Email verification code
              </label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-modern tracking-[0.35em]"
                placeholder="••••••"
                required
              />
            </div>

            <button type="submit" disabled={busy} className="btn-gradient mt-2">
              {loading ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & sign in'
              )}
            </button>
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">
              <button
                type="button"
                className="font-medium text-navy-700 transition hover:text-navy-900"
                onClick={() => {
                  setOtpStep(false)
                  setOtpCode('')
                  setChallengeToken('')
                  setSubmitError('')
                }}
              >
                Back to password
              </button>
              <button
                type="button"
                disabled={resending || !challengeToken}
                className="font-medium text-navy-700 transition hover:text-navy-900 disabled:opacity-60"
                onClick={handleResendOtp}
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {googleEnabled ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleLogin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {googleLoading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Connecting to Google…
                    </>
                  ) : (
                    <>
                      <GoogleMark />
                      Continue with Google
                    </>
                  )}
                </button>
                <div className="relative py-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="relative z-10 bg-white/80 px-3">or</span>
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
                </div>
              </>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                  Email / Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="input-modern pl-10"
                    placeholder="you@company.com"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-modern pl-10 pr-12"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 bg-white text-navy-700 focus:ring-blue-500/40"
                  />
                  Remember Me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-navy-700 transition hover:text-navy-900"
                >
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={busy} className="btn-gradient mt-2">
                {loading && !googleLoading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
              {submitError ? (
                <p className="text-sm text-red-600">
                  {submitError}
                  {(submitError.includes('Register on the website') ||
                    submitError.includes('No account found')) && (
                    <>
                      {' '}
                      <a
                        href={getWebsiteUrl('/pricing')}
                        className="font-semibold text-navy-800 underline"
                      >
                        View plans
                      </a>
                    </>
                  )}
                </p>
              ) : null}
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{' '}
          <a
            href={getWebsiteUrl('/pricing')}
            className="font-medium text-navy-800 hover:text-navy-950"
          >
            View plans & register
          </a>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
