import { BrandLogoPair } from '../../../components/branding/BrandLogoPair'
import { PageCenteredShell } from './PageCenteredShell'

const CONTACT_JOIN_TYPES = new Set(['name_email', 'name_mobile', 'name_email_mobile'])

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
  mobile,
  onMobileChange,
  otpEnabled = false,
  otpChannel = 'email',
  onOtpChannelChange,
  otpCode = '',
  onOtpCodeChange,
  otpSent = false,
  otpBusy = false,
  joinBusy = false,
  onSendOtp,
  joinError,
  joinBlocked = false,
  joinBlockedMessage = '',
  joinBlockedReason = '',
  onSubmit,
}) {
  const lockJoinFields = joinBlocked && joinBlockedReason !== 'plan_limit'
  const showEmail =
    joinRequirement === 'name_email' || joinRequirement === 'name_email_mobile'
  const showMobile =
    joinRequirement === 'name_mobile' || joinRequirement === 'name_email_mobile'
  const needsOtp = otpEnabled && CONTACT_JOIN_TYPES.has(joinRequirement)
  const showChannelPicker = needsOtp && joinRequirement === 'name_email_mobile'
  const busy = otpBusy || joinBusy

  return (
    <PageCenteredShell maxWidth="max-w-lg">
      <form onSubmit={onSubmit} className="quiz-enter space-y-4 text-left">
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

            {showEmail ? (
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

            {showMobile ? (
              <div>
                <label className="text-sm font-semibold text-slate-700">Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => onMobileChange(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                />
              </div>
            ) : null}

            {needsOtp ? (
              <div className="space-y-3 rounded-xl border border-blue-200/70 bg-slate-50/80 p-3">
                <p className="text-sm font-semibold text-slate-700">Verify to join</p>
                {showChannelPicker ? (
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="otp-channel"
                        checked={otpChannel === 'email'}
                        onChange={() => onOtpChannelChange?.('email')}
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="otp-channel"
                        checked={otpChannel === 'mobile'}
                        onChange={() => onOtpChannelChange?.('mobile')}
                      />
                      Mobile
                    </label>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    We&apos;ll send a code to your {joinRequirement === 'name_mobile' ? 'mobile' : 'email'}.
                  </p>
                )}

                <button
                  type="button"
                  onClick={onSendOtp}
                  disabled={busy}
                  className="h-10 w-full rounded-xl border border-blue-300 bg-white text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {otpBusy ? 'Sending…' : otpSent ? 'Resend code' : 'Send code'}
                </button>

                {otpSent ? (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Verification code</label>
                    <input
                      value={otpCode}
                      onChange={(e) => onOtpCodeChange?.(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm tracking-widest outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                      placeholder="6-digit code"
                    />
                  </div>
                ) : null}
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
          disabled={
            lockJoinFields ||
            (!showJoinDetails && !effectiveSessionCode) ||
            busy ||
            (needsOtp && (!otpSent || String(otpCode || '').length !== 6))
          }
          className="h-11 w-full rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joinBusy ? 'Joining…' : needsOtp ? 'Verify & join' : 'Join'}
        </button>
      </form>
    </PageCenteredShell>
  )
}
