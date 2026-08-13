import { Check, Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicPlansApi, signupApi } from '../services/publicApi'
import { getPlanDisplayPrice, formatPlanParticipantLimitShort, formatPlanParticipantLimit } from '../constants/siteContent'
import { getAdminPortalUrl, redirectToAdminLoginAfterSignup } from '../utils/adminPortal'
import {
  hasValidationErrors,
  validateCompanyName,
  validateEmail,
  validateFullName,
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

function RegisterPage() {
  const [searchParams] = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [step, setStep] = useState('register')
  const [loading, setLoading] = useState(false)

  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPublicPlansApi,
  })

  const plans = plansQuery.data || []

  useEffect(() => {
    const planFromUrl = searchParams.get('plan')
    if (planFromUrl) {
      setSelectedPlanId(planFromUrl)
    } else if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(String(plans[0].plan_id))
    }
  }, [searchParams, plans, selectedPlanId])

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
    const errors = validateRegisterForm({
      fullName,
      email,
      password,
      selectedPlanId,
      companyName,
    })
    setFieldErrors(errors)
    return !hasValidationErrors(errors)
  }

  const handleRegisterSubmit = (event) => {
    event.preventDefault()
    setSubmitError('')

    if (!runFullValidation()) {
      setSubmitError('Please fix the highlighted fields before continuing.')
      return
    }

    setStep('checkout')
  }

  const handleCompletePurchase = async () => {
    setSubmitError('')
    setLoading(true)

    try {
      await signupApi({
        full_name: fullName.trim(),
        company_name: companyName.trim() || undefined,
        email: email.trim(),
        password,
        plan_id: Number(selectedPlanId),
      })
      redirectToAdminLoginAfterSignup(email.trim())
    } catch (error) {
      setSubmitError(error.message || 'Unable to create account')
      setStep('register')
      setLoading(false)
    }
  }

  const price = selectedPlan ? getPlanDisplayPrice(selectedPlan) : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="eyebrow">Get started</p>
        <h1 className="section-heading mt-3">
          {step === 'register' ? 'Create your host account' : 'Confirm your plan'}
        </h1>
        <p className="section-subheading mx-auto max-w-2xl">
          {step === 'register'
            ? 'Register on this website, then continue in the host admin portal to build and run sessions.'
            : 'Review your details and complete signup. You will be redirected to the admin portal to sign in.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card p-6 sm:p-8">
          {step === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
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
                    className={`${fieldInputClass(fieldErrors.fullName)} pl-10`}
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
                  className={fieldInputClass(fieldErrors.email)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
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

              <button type="submit" className="btn-primary mt-2 w-full">
                Continue to buy
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-navy-900">Account</p>
                <p className="mt-2 text-sm text-slate-600">{fullName}</p>
                <p className="text-sm text-slate-600">{email}</p>
                {companyName ? <p className="text-sm text-slate-600">{companyName}</p> : null}
              </div>

              <div className="rounded-2xl border border-navy-200 bg-navy-50/50 p-5">
                <p className="text-sm font-semibold text-navy-900">Selected plan</p>
                {selectedPlan ? (
                  <>
                    <p className="mt-2 text-lg font-bold text-navy-950">{selectedPlan.name}</p>
                    <p className="text-sm text-slate-600">
                      {formatPlanParticipantLimit(selectedPlan.max_participants)}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-navy-900">
                      {price?.label}
                      <span className="text-base font-medium text-slate-500">{price?.period}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPlanParticipantLimitShort(selectedPlan.max_participants)} while connected live ·
                      Payment skipped for now
                    </p>
                  </>
                ) : null}
              </div>

              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-navy-700" />
                  Concurrent participant limit applied to your account
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-navy-700" />
                  Redirect to admin portal after completion
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-navy-700" />
                  Sign in with the email and password you just created
                </li>
              </ul>

              {submitError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompletePurchase}
                  disabled={loading}
                  className="btn-primary flex-1 sm:flex-none"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Complete signup'
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900">After signup</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Your account and plan are created.</li>
              <li>2. You are redirected to the admin portal login page.</li>
              <li>3. Sign in and open your dashboard to create your first session.</li>
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
