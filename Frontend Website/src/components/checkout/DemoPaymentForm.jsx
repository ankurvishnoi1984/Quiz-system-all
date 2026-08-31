import { CreditCard, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { confirmPaymentApi, initiatePaymentApi, initiateRenewalPaymentApi } from '../../services/publicApi'

function formatCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function DemoPaymentForm({
  email,
  payerName,
  companyName,
  plan,
  otpToken,
  renewToken,
  mode = 'signup',
  onPaid,
  onBack,
  submitError,
  setSubmitError,
}) {
  const [method, setMethod] = useState('card')
  const [loading, setLoading] = useState(false)
  const [payment, setPayment] = useState(null)
  const [upiStep, setUpiStep] = useState('form')

  const [cardholderName, setCardholderName] = useState(payerName || '')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [upiVpa, setUpiVpa] = useState('')

  useEffect(() => {
    let cancelled = false

    async function startCheckout() {
      setSubmitError('')
      setLoading(true)
      try {
        let initiated
        if (mode === 'renew') {
          initiated = await initiateRenewalPaymentApi({
            plan_id: plan.plan_id,
            renew_token: renewToken,
            payer_name: payerName.trim(),
            company_name: companyName?.trim() || undefined,
          })
        } else {
          initiated = await initiatePaymentApi({
            plan_id: plan.plan_id,
            email: email.trim(),
            payer_name: payerName.trim(),
            company_name: companyName?.trim() || undefined,
            ...(otpToken ? { otp_token: otpToken } : {}),
          })
        }
        if (!cancelled) setPayment(initiated)
      } catch (error) {
        if (!cancelled) setSubmitError(error.message || 'Unable to start checkout')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (plan?.plan_id && payerName && (mode === 'renew' ? renewToken : email)) {
      startCheckout()
    }

    return () => {
      cancelled = true
    }
  }, [plan?.plan_id, email, payerName, companyName, otpToken, renewToken, mode, setSubmitError])

  const handlePay = async () => {
    if (!payment?.payment_id) {
      setSubmitError('Payment session is not ready. Please go back and try again.')
      return
    }

    setSubmitError('')
    setLoading(true)

    try {
      if (method === 'upi') {
        setUpiStep('waiting')
        await new Promise((resolve) => setTimeout(resolve, 1800))
      }

      const confirmed = await confirmPaymentApi({
        payment_id: payment.payment_id,
        email: email.trim(),
        payment_method: method,
        ...(method === 'card'
          ? {
              cardholder_name: cardholderName.trim(),
              card_number: cardNumber.replace(/\s/g, ''),
              expiry,
              cvv,
            }
          : {
              upi_vpa: upiVpa.trim(),
              payer_name: payerName.trim(),
            }),
      })

      onPaid(confirmed)
    } catch (error) {
      setSubmitError(error.message || 'Payment failed')
      if (method === 'upi') setUpiStep('form')
    } finally {
      setLoading(false)
    }
  }

  const amountLabel = payment?.amount_display || `${plan?.currency || 'INR'} ${plan?.price_monthly}`

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Demo checkout.</strong> No real money is charged. Card and UPI flows are simulated for testing.
        When you go live, this will connect to Razorpay or another gateway using the same payment records.
      </div>

      <div className="rounded-2xl border border-navy-200 bg-navy-50/50 p-5">
        <p className="text-sm font-semibold text-navy-900">Amount due</p>
        <p className="mt-1 text-2xl font-bold text-navy-950">{amountLabel}</p>
        <p className="mt-1 text-xs text-slate-500">
          {payment?.payment_reference ? `Ref: ${payment.payment_reference}` : 'Preparing checkout…'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setMethod('card')
            setUpiStep('form')
            setSubmitError('')
          }}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
            method === 'card'
              ? 'border-navy-700 bg-navy-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="size-4" />
          Card
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod('upi')
            setUpiStep('form')
            setSubmitError('')
          }}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
            method === 'upi'
              ? 'border-navy-700 bg-navy-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="size-4" />
          UPI
        </button>
      </div>

      {method === 'card' ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="cardholderName" className="text-sm font-medium text-slate-700">
              Cardholder name
            </label>
            <input
              id="cardholderName"
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className="input-modern"
              placeholder="Name on card"
              autoComplete="cc-name"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cardNumber" className="text-sm font-medium text-slate-700">
              Card number
            </label>
            <input
              id="cardNumber"
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="input-modern"
              placeholder="4111 1111 1111 1111"
              autoComplete="cc-number"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="expiry" className="text-sm font-medium text-slate-700">
                Expiry
              </label>
              <input
                id="expiry"
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="input-modern"
                placeholder="MM/YY"
                autoComplete="cc-exp"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cvv" className="text-sm font-medium text-slate-700">
                CVV
              </label>
              <input
                id="cvv"
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input-modern"
                placeholder="123"
                autoComplete="cc-csc"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Demo mode: any valid-format card works. Only the last 4 digits and card brand are stored — never the full
            number or CVV.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {upiStep === 'waiting' ? (
            <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 size-10 animate-pulse rounded-full bg-navy-100" />
              <p className="font-semibold text-navy-900">Waiting for UPI approval…</p>
              <p className="mt-2 text-sm text-slate-600">
                In production this opens your UPI app (GPay, PhonePe, Paytm). Here we simulate approval after a short
                delay.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="upiVpa" className="text-sm font-medium text-slate-700">
                  UPI ID
                </label>
                <input
                  id="upiVpa"
                  type="text"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  className="input-modern"
                  placeholder="yourname@upi"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-slate-500">
                Demo UPI: enter any valid UPI ID format (e.g. name@oksbi). We store a masked VPA for records, not your
                banking credentials.
              </p>
            </>
          )}
        </div>
      )}

      {submitError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onBack} className="btn-secondary" disabled={loading}>
          Back
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={loading || !payment?.payment_id || (method === 'upi' && upiStep === 'waiting')}
          className="btn-primary flex-1 sm:flex-none"
        >
          {loading
            ? method === 'upi' && upiStep === 'waiting'
              ? 'Confirming UPI…'
              : 'Processing…'
            : `Pay ${amountLabel}`}
        </button>
      </div>
    </div>
  )
}

export default DemoPaymentForm
