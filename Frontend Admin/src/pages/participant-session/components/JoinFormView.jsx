import { BrandLogoPair } from '../../../components/branding/BrandLogoPair'
import { PageCenteredShell } from './PageCenteredShell'

export function JoinFormView({
  hasSessionCodeInUrl,
  sessionCodeInput,
  onSessionCodeChange,
  sessionLookupFailed,
  effectiveSessionCode,
  sessionQueryLoading,
  showJoinDetails,
  session,
  joinRequirement,
  name,
  onNameChange,
  email,
  onEmailChange,
  joinError,
  joinBlocked = false,
  joinBlockedMessage = '',
  joinBlockedReason = '',
  onSubmit,
}) {
  const lockJoinFields = joinBlocked && joinBlockedReason !== 'plan_limit'

  return (
    <PageCenteredShell maxWidth="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4 text-left">
        <div className="text-center">
          <BrandLogoPair
            variant="hero"
            sessionLogoUrl={session?.logo_url}
            sessionTitle={session?.title || 'Session'}
          />
          <h1 className="text-2xl font-bold text-navy-900">
            {showJoinDetails ? session.title : 'Join a session'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {showJoinDetails
              ? `Session code: ${session.session_code || effectiveSessionCode}`
              : 'Enter your session code to continue'}
          </p>
        </div>

        {!lockJoinFields && !hasSessionCodeInUrl ? (
          <div>
            <label className="text-sm font-semibold text-slate-700">Session code</label>
            <input
              value={sessionCodeInput}
              onChange={(e) => onSessionCodeChange(e.target.value.toUpperCase())}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 font-mono text-sm font-semibold tracking-widest text-navy-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Enter session code"
              autoComplete="off"
              spellCheck={false}
            />
            {sessionLookupFailed && effectiveSessionCode ? (
              <p className="mt-2 text-sm font-semibold text-red-700">
                Session not found. Check the code and try again.
              </p>
            ) : null}
            {effectiveSessionCode && sessionQueryLoading ? (
              <p className="mt-2 text-sm text-slate-500">Looking up session...</p>
            ) : null}
          </div>
        ) : null}

        {!lockJoinFields && showJoinDetails && joinRequirement === 'anonymous' ? (
          <div>
            <label className="text-sm font-semibold text-slate-700">Name</label>
            <input
              value=""
              disabled
              placeholder="Assigned on join (e.g. Anonymous1)"
              className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-500 placeholder:text-slate-400"
            />
          </div>
        ) : !lockJoinFields && showJoinDetails ? (
          <>
            <div>
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Enter your name"
              />
            </div>

            {joinRequirement === 'name_email' ? (
              <div>
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  placeholder="Enter your email"
                />
              </div>
            ) : null}
          </>
        ) : null}

        {joinBlocked ? (
          <p
            className={
              joinBlockedReason === 'plan_limit'
                ? 'rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800'
                : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900'
            }
          >
            {joinBlockedMessage ||
              (joinBlockedReason === 'plan_limit'
                ? 'Participant limit exceeded for this account.'
                : 'Session has already started')}
          </p>
        ) : null}

        {joinError ? (
          <p className="text-sm font-semibold text-red-700">{joinError}</p>
        ) : null}

        <button
          type="submit"
          disabled={lockJoinFields || (!showJoinDetails && !effectiveSessionCode)}
          className="h-11 w-full rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Join
        </button>
      </form>
    </PageCenteredShell>
  )
}
