import { Check, Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DemoPaymentForm from '../components/checkout/DemoPaymentForm'
import {
  fetchAuthFeaturesApi,
  fetchPublicPlansApi,
  sendPaymentOtpApi,
  signupApi,
  verifyPaymentOtpApi,
} from '../services/publicApi'
import { signInWithGoogleForSignup } from '../services/googleAuth'
import { isFirebaseConfigured } from '../config/firebase'
import { getPlanDisplayPrice, formatPlanParticipantLimitShort, formatPlanParticipantLimit } from '../constants/siteContent'
import { getAdminPortalUrl, redirectToAdminLoginAfterSignup } from '../utils/adminPortal'
import {
  hasValidationErrors,
  validateCompanyName,
  validateEmail,
  validateFullName,
  validateMobile,
  validatePassword,
  validatePlanId,
  validateRegisterForm,
} from '../utils/registerValidation'

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

function RegisterPage() {
  const [searchParams] = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [step, setStep] = useState('register')
  const [loading, setLoading] = useState(false)
  const [paidPayment, setPaidPayment] = useState(null)
  const [emailOtpCode, setEmailOtpCode] = useState('')
  const [mobileOtpCode, setMobileOtpCode] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [firebaseIdToken, setFirebaseIdToken] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleIdentityLocked = Boolean(firebaseIdToken)

  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPublicPlansApi,
  })

  const featuresQuery = useQuery({
    queryKey: ['auth-features'],
    queryFn: fetchAuthFeaturesApi,
    staleTime: 60_000,
  })

  const paymentOtpEnabled = featuresQuery.data?.payment_otp_enabled !== false
  const googleEnabled =
    featuresQuery.data?.google_auth_enabled === true && isFirebaseConfigured()
  const plans = plansQuery.data || []

  // Seed plan from URL once (or first plan). Do not re-apply when the user changes the dropdown.
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

  const clearFieldError = (field) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      return { ...current, [field]: '' }
    })
  }

  const runFullValidation = () => {
    const errors = validateRegisterForm(
      {
        fullName,
        email,
        mobile,
        password,
        selectedPlanId,
        companyName,
      },
      { requirePassword: !googleIdentityLocked },
    )
    setFieldErrors(errors)
    return !hasValidationErrors(errors)
  }

  const handleGoogleContinue = async () => {
    if (googleLoading || loading) return
    setSubmitError('')
    setGoogleLoading(true)
    try {
      const result = await signInWithGoogleForSignup()
      setFirebaseIdToken(result.idToken)
      if (result.fullName) setFullName(result.fullName)
      if (result.email) setEmail(result.email)
      setPassword('')
      setFieldErrors((current) => ({
        ...current,
        fullName: '',
        email: '',
        password: '',
      }))
    } catch (error) {
      setSubmitError(error.message || 'Unable to continue with Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  const clearGoogleIdentity = () => {
    setFirebaseIdToken('')
    setSubmitError('')
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    if (!runFullValidation()) {
      setSubmitError('Please fix the highlighted fields before continuing.')
      return
    }

    if (!paymentOtpEnabled) {
      setOtpToken('')
      setStep('payment')
      return
    }

    setOtpSending(true)
    try {
      await sendPaymentOtpApi({
        email: email.trim(),
        fullName: fullName.trim(),
        mobile: mobile.trim(),
      })
      setEmailOtpCode('')
      setMobileOtpCode('')
      setOtpToken('')
      setStep('otp')
    } catch (error) {
      setSubmitError(error.message || 'Unable to send verification code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleOtpSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const emailCode = emailOtpCode.trim()
    const mobileCode = mobileOtpCode.trim()
    if (!/^\d{6}$/.test(emailCode) || !/^\d{6}$/.test(mobileCode)) {
      setSubmitError('Enter the 6-digit codes from your email and mobile.')
      return
    }

    setLoading(true)
    try {
      const verified = await verifyPaymentOtpApi({
        email: email.trim(),
        mobile: mobile.trim(),
        emailCode,
        mobileCode,
      })
      setOtpToken(verified?.otp_token || '')
      setStep('payment')
    } catch (error) {
      setSubmitError(error.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setSubmitError('')
    setOtpSending(true)
    try {
      await sendPaymentOtpApi({
        email: email.trim(),
        fullName: fullName.trim(),
        mobile: mobile.trim(),
      })
      setEmailOtpCode('')
      setMobileOtpCode('')
    } catch (error) {
      setSubmitError(error.message || 'Unable to resend code')
    } finally {
      setOtpSending(false)
    }
  }

  const handlePaymentSuccess = async (payment) => {
    setPaidPayment(payment)
    setSubmitError('')
    setLoading(true)

    try {
      await signupApi({
        full_name: fullName.trim(),
        company_name: companyName.trim() || undefined,
        email: email.trim(),
        mobile_number: mobile.trim(),
        ...(googleIdentityLocked
          ? { firebase_id_token: firebaseIdToken }
          : { password }),
        plan_id: Number(selectedPlanId),
        payment_id: payment.payment_id,
      })
      redirectToAdminLoginAfterSignup(email.trim())
    } catch (error) {
      setSubmitError(error.message || 'Payment succeeded but account creation failed')
      setStep('payment')
      setLoading(false)
    }
  }

  const price = selectedPlan ? getPlanDisplayPrice(selectedPlan) : null
  const stepTitle =
    step === 'register'
      ? 'Create your host account'
      : step === 'otp'
        ? 'Verify email & mobile'
        : step === 'payment'
          ? 'Complete payment'
          : 'Confirm your plan'

  const stepSubtitle =
    step === 'register'
      ? 'Register on this website, verify your email and mobile, pay for your plan, then continue in the host admin portal.'
      : step === 'otp'
        ? `We sent 6-digit codes to ${email.trim()} and ${mobile.trim()}. Enter both to continue to payment.`
        : step === 'payment'
          ? 'Use demo card or UPI checkout. Your account is created only after payment succeeds.'
          : 'Review your details before payment.'

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="eyebrow">Get started</p>
        <h1 className="section-heading mt-3">{stepTitle}</h1>
        <p className="section-subheading mx-auto max-w-2xl">{stepSubtitle}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card p-6 sm:p-8">
          {step === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
              {googleEnabled ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={googleLoading || loading || otpSending}
                    onClick={handleGoogleContinue}
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
                        {googleIdentityLocked
                          ? 'Continue with a different Google account'
                          : 'Continue with Google'}
                      </>
                    )}
                  </button>
                  {googleIdentityLocked ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      Google identity linked for <strong>{email}</strong>. Mobile, plan, and payment
                      are still required.{' '}
                      <button
                        type="button"
                        onClick={clearGoogleIdentity}
                        className="font-semibold underline"
                      >
                        Use email & password instead
                      </button>
                    </p>
                  ) : (
                    <div className="relative py-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <span className="relative z-10 bg-white px-3">or register with email</span>
                      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  Full name *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    disabled={googleIdentityLocked}
                    onChange={(event) => {
                      setFullName(event.target.value)
                      clearFieldError('fullName')
                    }}
                    onBlur={() =>
                      setFieldErrors((current) => ({
                        ...current,
                        fullName: validateFullName(fullName),
                      }))
                    }
                    className={`${fieldInputClass(fieldErrors.fullName)} pl-10 disabled:bg-slate-50`}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                  />
                </div>
                <FieldError id="fullName-error" message={fieldErrors.fullName} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                  Organization name <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(event) => {
                    setCompanyName(event.target.value)
                    clearFieldError('companyName')
                  }}
                  onBlur={() =>
                    setFieldErrors((current) => ({
                      ...current,
                      companyName: validateCompanyName(companyName),
                    }))
                  }
                  className={fieldInputClass(fieldErrors.companyName)}
                  placeholder="Your company or team name"
                  aria-invalid={Boolean(fieldErrors.companyName)}
                  aria-describedby={fieldErrors.companyName ? 'companyName-error' : undefined}
                />
                <FieldError id="companyName-error" message={fieldErrors.companyName} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Work email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled={googleIdentityLocked}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearFieldError('email')
                  }}
                  onBlur={() =>
                    setFieldErrors((current) => ({
                      ...current,
                      email: validateEmail(email),
                    }))
                  }
                  className={`${fieldInputClass(fieldErrors.email)} disabled:bg-slate-50`}
                  placeholder="you@company.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                <FieldError id="email-error" message={fieldErrors.email} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mobile" className="text-sm font-medium text-slate-700">
                  Mobile number *
                </label>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => {
                    setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))
                    clearFieldError('mobile')
                  }}
                  onBlur={() =>
                    setFieldErrors((current) => ({
                      ...current,
                      mobile: validateMobile(mobile),
                    }))
                  }
                  className={fieldInputClass(fieldErrors.mobile)}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  aria-invalid={Boolean(fieldErrors.mobile)}
                  aria-describedby={fieldErrors.mobile ? 'mobile-error' : undefined}
                />
                <FieldError id="mobile-error" message={fieldErrors.mobile} />
              </div>

              {!googleIdentityLocked ? (
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
                        clearFieldError('password')
                      }}
                      onBlur={() =>
                        setFieldErrors((current) => ({
                          ...current,
                          password: validatePassword(password),
                        }))
                      }
                      className={`${fieldInputClass(fieldErrors.password)} pl-10 pr-12`}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
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
              ) : null}

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
                      clearFieldError('plan')
                    }}
                    onBlur={() =>
                      setFieldErrors((current) => ({
                        ...current,
                        plan: validatePlanId(selectedPlanId),
                      }))
                    }
                    className={fieldInputClass(fieldErrors.plan)}
                    aria-invalid={Boolean(fieldErrors.plan)}
                    aria-describedby={fieldErrors.plan ? 'plan-error' : undefined}
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

              <button type="submit" disabled={otpSending} className="btn-primary mt-2 w-full">
                {otpSending ? (
                  <>
                    <LoaderCircle className="mr-2 inline size-4 animate-spin" />
                    Sending code...
                  </>
                ) : paymentOtpEnabled ? (
                  'Continue to verification'
                ) : (
                  'Continue to payment'
                )}
              </button>
            </form>
          ) : step === 'otp' ? (
            <form onSubmit={handleOtpSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="emailOtpCode" className="text-sm font-medium text-slate-700">
                  Email verification code *
                </label>
                <input
                  id="emailOtpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={emailOtpCode}
                  onChange={(event) => setEmailOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-modern tracking-[0.35em]"
                  placeholder="••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mobileOtpCode" className="text-sm font-medium text-slate-700">
                  Mobile verification code *
                </label>
                <input
                  id="mobileOtpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mobileOtpCode}
                  onChange={(event) => setMobileOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
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
                    Verifying...
                  </>
                ) : (
                  'Verify & continue to payment'
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  className="font-medium text-navy-800 hover:text-navy-950"
                  onClick={() => {
                    setStep('register')
                    setSubmitError('')
                    setEmailOtpCode('')
                    setMobileOtpCode('')
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={otpSending}
                  className="font-medium text-navy-800 hover:text-navy-950 disabled:opacity-60"
                  onClick={handleResendOtp}
                >
                  {otpSending ? 'Sending…' : 'Resend codes'}
                </button>
              </div>
            </form>
          ) : step === 'payment' ? (
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-navy-900">
                  <LoaderCircle className="size-4 animate-spin" />
                  Creating your account after successful payment…
                </div>
              ) : (
                <DemoPaymentForm
                  email={email}
                  payerName={fullName}
                  companyName={companyName}
                  plan={selectedPlan}
                  otpToken={otpToken || undefined}
                  onPaid={handlePaymentSuccess}
                  onBack={() => {
                    setStep(paymentOtpEnabled ? 'otp' : 'register')
                    setSubmitError('')
                  }}
                  submitError={submitError}
                  setSubmitError={setSubmitError}
                />
              )}
            </div>
          ) : null}
        </section>

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
                {fullName ? (
                  <p>
                    Account: {fullName}
                    <br />
                    {email}
                    {mobile ? (
                      <>
                        <br />
                        {mobile}
                      </>
                    ) : null}
                  </p>
                ) : null}
                {paidPayment?.payment_reference ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                    Paid — {paidPayment.payment_reference}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900">After signup</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-navy-700" />
                Demo payment recorded securely on our server
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-navy-700" />
                Account and plan created automatically
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-navy-700" />
                Welcome email with sign-in details and plan information
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-navy-700" />
                Redirect to admin portal to sign in
              </li>
            </ol>
          </div>

          <p className="text-sm text-slate-500">
            Already registered?{' '}
            <a href={getAdminPortalUrl('/login')} className="font-medium text-navy-800 hover:text-navy-950">
              Go to host portal
            </a>
            {' · '}
            <Link to="/pricing" className="font-medium text-navy-800 hover:text-navy-950">
              View pricing
            </Link>
          </p>
        </aside>
      </div>
    </div>
  )
}

export default RegisterPage
