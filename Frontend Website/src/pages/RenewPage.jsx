import { Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DemoPaymentForm from '../components/checkout/DemoPaymentForm'
import {
  applyPlanRenewApi,
  fetchAuthFeaturesApi,
  fetchPublicPlansApi,
  resendLoginOtpApi,
  startPlanRenewApi,
  verifyPlanRenewOtpApi,
} from '../services/publicApi'
import {
  getPlanDisplayPrice,
  formatPlanParticipantLimitShort,
  formatPlanParticipantLimit,
} from '../constants/siteContent'
import { getAdminPortalUrl } from '../utils/adminPortal'
import { validateEmail, validatePlanId } from '../utils/registerValidation'

function fieldInputClass(hasError) {
  return hasError ? 'input-modern border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'input-modern'
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-red-600" role="alert">
      {message}
    </p>
  )
}

function RenewPage() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState('verify')
  const [email, setEmail] = useState(() => searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [renewToken, setRenewToken] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPublicPlansApi,
  })

  const featuresQuery = useQuery({
    queryKey: ['auth-features'],
    queryFn: fetchAuthFeaturesApi,
    staleTime: 60_000,
  })

  const loginOtpEnabled = featuresQuery.data?.login_otp_enabled !== false
  const plans = plansQuery.data || []

  useEffect(() => {
    const planFromUrl = searchParams.get('plan')
    if (planFromUrl) {
      setSelectedPlanId((current) => current || planFromUrl)
      return
    }
    if (plans.length > 0) {
      setSelectedPlanId((current) => current || String(plans[0].plan_id))
    }
  }, [searchParams, plans])

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.plan_id) === String(selectedPlanId)),
    [plans, selectedPlanId],
  )

  const price = selectedPlan ? getPlanDisplayPrice(selectedPlan) : null

  const stepTitle =
    step === 'verify'
      ? 'Renew your plan'
      : step === 'otp'
        ? 'Verify your email'
        : step === 'plan'
          ? 'Choose your plan'
          : step === 'payment'
            ? 'Complete payment'
            : 'Plan renewed'

  const stepSubtitle =
    step === 'verify'
      ? 'Sign in with your existing host account to renew or change your plan. No new account is created.'
      : step === 'otp'
        ? `Enter the 6-digit code sent to ${otpEmail || email}.`
        : step === 'plan'
          ? 'Pick the plan you want going forward — you can change from your current plan.'
          : step === 'payment'
            ? 'Pay for your selected plan. Your account stays the same; only the plan entitlement updates.'
            : 'Your plan is active again. Continue in the host portal.'

  const handleVerifySubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const emailError = validateEmail(email)
    const passwordError = password ? '' : 'Password is required'
    setFieldErrors({ email: emailError, password: passwordError })
    if (emailError || passwordError) {
      setSubmitError('Please fix the highlighted fields before continuing.')
      return
    }

    setLoading(true)
    try {
      const result = await startPlanRenewApi({
        email: email.trim(),
        password,
      })

      if (result?.requires_otp) {
        setChallengeToken(result.challenge_token || '')
        setOtpEmail(result.email || email.trim())
        setOtpCode('')
        setStep('otp')
        return
      }

      setRenewToken(result?.renew_token || '')
      setFullName(result?.full_name || '')
      setEmail(result?.email || email.trim())
      setStep('plan')
    } catch (error) {
      setSubmitError(error.message || 'Unable to verify account')
    } finally {
      setLoading(false)
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

    setLoading(true)
    try {
      const result = await verifyPlanRenewOtpApi({
        challenge_token: challengeToken,
        code,
        email: otpEmail || email.trim(),
      })
      setRenewToken(result?.renew_token || '')
      setFullName(result?.full_name || '')
      setEmail(result?.email || email.trim())
      setStep('plan')
    } catch (error) {
      setSubmitError(error.message || 'Unable to verify code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setSubmitError('')
    setOtpSending(true)
    try {
      await resendLoginOtpApi({ challenge_token: challengeToken })
      setOtpCode('')
    } catch (error) {
      setSubmitError(error.message || 'Unable to resend code')
    } finally {
      setOtpSending(false)
    }
  }

  const handlePlanContinue = (event) => {
    event.preventDefault()
    setSubmitError('')
    const planError = validatePlanId(selectedPlanId)
    setFieldErrors({ plan: planError })
    if (planError) {
      setSubmitError('Please select a plan.')
      return
    }
    if (!renewToken) {
      setSubmitError('Renewal session expired. Please verify your account again.')
      setStep('verify')
      return
    }
    setStep('payment')
  }

  const handlePaymentSuccess = async (payment) => {
    setSubmitError('')
    setLoading(true)
    try {
      await applyPlanRenewApi({
        renew_token: renewToken,
        payment_id: payment.payment_id,
        plan_id: Number(selectedPlanId),
      })
      setStep('done')
    } catch (error) {
      setSubmitError(error.message || 'Payment succeeded but plan renewal failed')
      setStep('payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="eyebrow">Plan renewal</p>
        <h1 className="section-heading mt-3">{stepTitle}</h1>
        <p className="section-subheading mx-auto max-w-2xl">{stepSubtitle}</p>
      </div>

      <div
        className={`grid gap-8 ${
          step === 'verify' || step === 'otp' ? 'max-w-xl mx-auto' : 'lg:grid-cols-[1.2fr_0.8fr]'
        }`}
      >
        <section className="glass-card p-6 sm:p-8">
          {step === 'verify' ? (
            <form onSubmit={handleVerifySubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Work email *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setFieldErrors((current) => ({ ...current, email: '' }))
                    }}
                    className={`${fieldInputClass(fieldErrors.email)} pl-10`}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <FieldError id="email-error" message={fieldErrors.email} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setFieldErrors((current) => ({ ...current, password: '' }))
                    }}
                    className={`${fieldInputClass(fieldErrors.password)} pl-10 pr-12`}
                    placeholder="Your host portal password"
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
                <FieldError id="password-error" message={fieldErrors.password} />
              </div>

              {loginOtpEnabled ? (
                <p className="text-xs text-slate-500">
                  If email verification is enabled for login, we will send a one-time code after your password is
                  checked.
                </p>
              ) : null}

              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {submitError}
                </p>
              ) : null}

              <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 inline size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          ) : null}

          {step === 'otp' ? (
            <form onSubmit={handleOtpSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="otpCode" className="text-sm font-medium text-slate-700">
                  Verification code *
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

              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {submitError}
                </p>
              ) : null}

              <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 inline size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify & continue'
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  className="font-medium text-navy-800 hover:text-navy-950"
                  onClick={() => {
                    setStep('verify')
                    setSubmitError('')
                    setOtpCode('')
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={otpSending || !challengeToken}
                  className="font-medium text-navy-800 hover:text-navy-950 disabled:opacity-60"
                  onClick={handleResendOtp}
                >
                  {otpSending ? 'Sending…' : 'Resend code'}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'plan' ? (
            <form onSubmit={handlePlanContinue} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="plan" className="text-sm font-medium text-slate-700">
                  Select plan *
                </label>
                {plansQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <LoaderCircle className="size-4 animate-spin" />
                    Loading plans...
                  </div>
                ) : (
                  <select
                    id="plan"
                    value={selectedPlanId}
                    onChange={(event) => {
                      setSelectedPlanId(event.target.value)
                      setFieldErrors((current) => ({ ...current, plan: '' }))
                    }}
                    className={fieldInputClass(fieldErrors.plan)}
                  >
                    {plans.map((plan) => {
                      const planPrice = getPlanDisplayPrice(plan)
                      return (
                        <option key={plan.plan_id} value={plan.plan_id}>
                          {plan.name} — {formatPlanParticipantLimitShort(plan.max_participants)} ({planPrice.label}
                          {planPrice.period})
                        </option>
                      )
                    })}
                  </select>
                )}
                <FieldError id="plan-error" message={fieldErrors.plan} />
              </div>

              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStep('verify')
                    setRenewToken('')
                    setSubmitError('')
                  }}
                >
                  Back
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Continue to payment
                </button>
              </div>
            </form>
          ) : null}

          {step === 'payment' ? (
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-navy-900">
                  <LoaderCircle className="size-4 animate-spin" />
                  Applying your renewed plan…
                </div>
              ) : (
                <DemoPaymentForm
                  mode="renew"
                  email={email}
                  payerName={fullName || email}
                  plan={selectedPlan}
                  renewToken={renewToken}
                  onPaid={handlePaymentSuccess}
                  onBack={() => {
                    setStep('plan')
                    setSubmitError('')
                  }}
                  submitError={submitError}
                  setSubmitError={setSubmitError}
                />
              )}
            </div>
          ) : null}

          {step === 'done' ? (
            <div className="space-y-4 text-center">
              <p className="text-lg font-semibold text-navy-900">Your plan has been renewed</p>
              <p className="text-sm text-slate-600">
                {selectedPlan?.name ? `${selectedPlan.name} is now active on your account.` : 'Your plan is active.'}
              </p>
              <a href={getAdminPortalUrl('/my-plan')} className="btn-primary inline-flex">
                Open My Plan in host portal
              </a>
              <p className="text-sm text-slate-500">
                Or{' '}
                <a href={getAdminPortalUrl('/login')} className="font-medium text-navy-800 hover:text-navy-950">
                  sign in
                </a>{' '}
                if you are not already logged in.
              </p>
            </div>
          ) : null}
        </section>

        {step === 'verify' || step === 'otp' ? (
          <p className="text-center text-sm text-slate-500 lg:col-span-full">
            New here?{' '}
            <Link to="/register" className="font-medium text-navy-800 hover:text-navy-950">
              Create a host account
            </Link>
            {' · '}
            <Link to="/pricing" className="font-medium text-navy-800 hover:text-navy-950">
              View pricing
            </Link>
          </p>
        ) : (
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-navy-900">Order summary</h2>
              {selectedPlan ? (
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-navy-900">{selectedPlan.name}</span>
                    <br />
                    {formatPlanParticipantLimit(selectedPlan.max_participants)}
                  </p>
                  <p className="text-2xl font-bold text-navy-950">
                    {price?.label}
                    <span className="text-base font-medium text-slate-500">{price?.period}</span>
                  </p>
                  {email ? (
                    <p>
                      Account: {fullName || 'Host'}
                      <br />
                      {email}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Select a plan to see pricing.</p>
              )}
            </div>

            <p className="text-sm text-slate-500">
              New here?{' '}
              <Link to="/register" className="font-medium text-navy-800 hover:text-navy-950">
                Create a host account
              </Link>
              {' · '}
              <Link to="/pricing" className="font-medium text-navy-800 hover:text-navy-950">
                View pricing
              </Link>
            </p>
          </aside>
        )}
      </div>
    </div>
  )
}

export default RenewPage
