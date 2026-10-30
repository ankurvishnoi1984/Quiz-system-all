import { Eye, EyeOff, LoaderCircle, Lock, Shield, User } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function SessionAdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const loading = useAuthStore((state) => state.isLoading)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    try {
      const result = await login({
        email: username.trim(),
        password,
        rememberMe,
      })

      if (result?.requires_otp) {
        logout()
        setSubmitError('This login is for Session Admin only. Use the Host Portal to sign in.')
        return
      }

      if (result?.role !== 'session_admin') {
        logout()
        setSubmitError('This login is for Session Admin only. Use the Host Portal to sign in.')
      }
    } catch (error) {
      setSubmitError(error.message || 'Unable to login')
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-teal-50 via-cyan-50 to-slate-100" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(8,145,178,0.1),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(15,118,110,0.08),transparent_40%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 right-8 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />

      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-teal-200/70 bg-white/90 p-6 shadow-xl shadow-teal-950/10 backdrop-blur sm:p-8">
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-800/25">
            <Shield className="size-7" aria-hidden />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
            Session Admin
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950">Sign in</h1>
          <p className="text-sm text-slate-600">
            Use the username and password from your session credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="sa-username" className="text-sm font-medium text-slate-700">
              Username
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-teal-600/60" />
              <input
                id="sa-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input-modern pl-10"
                placeholder="session-admin-username"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sa-password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-teal-600/60" />
              <input
                id="sa-password"
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

          <label className="inline-flex cursor-pointer items-center gap-2 pt-1 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white text-teal-700 focus:ring-teal-500/40"
            />
            Remember Me
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white shadow-md shadow-teal-800/20 transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        </form>

        {/* <p className="mt-6 text-center text-sm text-slate-600">
          Host or staff?{' '}
          <Link to="/login" className="font-semibold text-teal-800 hover:text-teal-950">
            Host Portal login
          </Link>
        </p> */}
      </section>
    </main>
  )
}

export default SessionAdminLoginPage
