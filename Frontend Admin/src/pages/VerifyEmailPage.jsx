import { CheckCircle2, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resendEmailVerificationApi, verifyEmailApi } from '../services/authApi'
import { useAuthStore } from '../store/authStore'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [status, setStatus] = useState(token ? 'verifying' : 'pending')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    verifyEmailApi(token)
      .then((response) => {
        if (!active) return
        const verifiedUser = response?.data?.user
        const currentUser = useAuthStore.getState().user
        if (verifiedUser && currentUser) {
          useAuthStore.setState({
            user: { ...currentUser, ...verifiedUser, email_verified: true },
          })
        }
        setStatus('verified')
      })
      .catch((error) => {
        if (!active) return
        setStatus('error')
        setMessage(error.message || 'The verification link is invalid or expired.')
      })
    return () => {
      active = false
    }
  }, [token])

  return (
    <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-4">
      <section className="w-full max-w-lg rounded-3xl border border-blue-200/70 bg-white p-8 text-center shadow-xl shadow-blue-900/10">
        {status === 'verified' ? (
          <>
            <CheckCircle2 className="mx-auto size-16 text-emerald-600" />
            <h1 className="mt-5 text-3xl font-bold text-navy-900">Email verified</h1>
            <p className="mt-3 text-slate-600">Your team account is ready to use.</p>
            <Link
              to={user ? (user.must_change_password ? '/change-password' : '/dashboard') : '/login'}
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-navy-900 px-5 text-sm font-semibold text-white"
            >
              {user ? 'Continue' : 'Sign in'}
            </Link>
          </>
        ) : (
          <>
            <MailCheck className="mx-auto size-16 text-blue-600" />
            <h1 className="mt-5 text-3xl font-bold text-navy-900">
              {status === 'verifying' ? 'Verifying your email…' : 'Verify your email'}
            </h1>
            <p className="mt-3 text-slate-600">
              {status === 'error'
                ? message
                : 'Open the verification link sent to your email before accessing the dashboard.'}
            </p>
            {!token && user && accessToken ? (
              <button
                type="button"
                disabled={resending}
                onClick={async () => {
                  setResending(true)
                  setMessage('')
                  try {
                    await resendEmailVerificationApi(accessToken)
                    setMessage('A new link and temporary password were sent to your email.')
                  } catch (error) {
                    setMessage(error.message || 'Could not resend verification email.')
                  } finally {
                    setResending(false)
                  }
                }}
                className="mt-6 h-11 rounded-xl bg-navy-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            ) : null}
            {message && status !== 'error' ? (
              <p className="mt-4 text-sm font-medium text-blue-700">{message}</p>
            ) : null}
            {!user ? (
              <Link to="/login" className="mt-6 block text-sm font-semibold text-blue-700 hover:underline">
                Back to sign in
              </Link>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
