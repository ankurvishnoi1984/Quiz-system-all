import { Check, Copy, KeyRound, Link2, LoaderCircle, Shield } from 'lucide-react'
import { useState } from 'react'
import { changeSessionAdminPasswordApi } from '../../services/sessionAdminApi'

function CopyField({ label, value, mono = false }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700/80">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={`min-w-0 flex-1 truncate rounded-xl border border-teal-200/80 bg-white px-3 py-2 text-sm text-slate-800 ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(String(value))
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          }}
          className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition ${
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
          }`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function SessionAdminCredentialsCard({
  sessionAdmin,
  sessionId,
  accessToken,
  onUpdated,
  compact = false,
}) {
  const [showChange, setShowChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!sessionAdmin?.username) {
    return (
      <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-3 text-sm text-teal-800">
        Session Admin login will appear here after the session is created.
      </div>
    )
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!accessToken || !sessionId) {
      setError('Unable to update password right now.')
      return
    }
    setBusy(true)
    try {
      const updated = await changeSessionAdminPasswordApi(accessToken, sessionId, newPassword)
      setSuccess('Password updated. Share the new password with your Session Admin.')
      setNewPassword('')
      setConfirmPassword('')
      setShowChange(false)
      onUpdated?.(updated)
    } catch (err) {
      setError(err?.message || 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-teal-200/80 bg-linear-to-br from-teal-50 via-cyan-50/80 to-white shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-700/20">
          <Shield className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Session Admin</p>
          <h3 className="mt-0.5 text-lg font-bold text-teal-950">Read-only session login</h3>
          <p className="mt-1 text-sm leading-relaxed text-teal-900/75">
            Separate login for watching this session and opening reports. Cannot build questions or go
            live.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <CopyField label="Sign-in link" value={sessionAdmin.login_url} />
        <CopyField label="Username" value={sessionAdmin.username} mono />
        {sessionAdmin.password_is_default && sessionAdmin.password ? (
          <CopyField label="Password" value={sessionAdmin.password} mono />
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700/80">Password</p>
            <p className="rounded-xl border border-teal-200/80 bg-white px-3 py-2 text-sm text-slate-600">
              Changed from the default. Use “Change password” below if you need a new one.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={sessionAdmin.login_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
        >
          <Link2 className="size-4" />
          Open login
        </a>
        <button
          type="button"
          onClick={() => {
            setShowChange((v) => !v)
            setError('')
            setSuccess('')
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          <KeyRound className="size-4" />
          Change password
        </button>
      </div>

      {success ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {showChange ? (
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3 rounded-xl border border-teal-200 bg-white/90 p-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="sa-new-password">
              New password
            </label>
            <input
              id="sa-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-modern"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="sa-confirm-password">
              Confirm password
            </label>
            <input
              id="sa-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-modern"
              minLength={8}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn-gradient">
            {busy ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save password'
            )}
          </button>
        </form>
      ) : null}
    </div>
  )
}
