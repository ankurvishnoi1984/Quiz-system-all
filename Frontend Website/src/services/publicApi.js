const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const { headers, ...rest } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    const details = Array.isArray(payload?.errors) ? payload.errors : null
    const message = details?.length
      ? details.join('. ')
      : payload?.message || 'Request failed'
    const error = new Error(message)
    error.status = response.status
    error.details = details
    throw error
  }

  return payload
}

export async function fetchPublicPlansApi() {
  const response = await request('/plans/public')
  return response?.data?.plans || []
}

export async function signupApi(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function initiatePaymentApi(payload) {
  const response = await request('/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data?.payment
}

export async function initiateRenewalPaymentApi(payload) {
  const response = await request('/payments/renew/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data?.payment
}

export async function confirmPaymentApi(payload) {
  const response = await request('/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data?.payment
}

export async function startPlanRenewApi({ email }) {
  const response = await request('/auth/renew/start', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return response?.data
}

export async function verifyPlanRenewOtpApi({ email, code }) {
  const response = await request('/auth/renew/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  return response?.data
}

export async function applyPlanRenewApi({ renew_token, payment_id, plan_id }) {
  const response = await request('/auth/renew/apply', {
    method: 'POST',
    body: JSON.stringify({ renew_token, payment_id, plan_id }),
  })
  return response?.data
}

export async function sendRenewOtpApi({ email, fullName }) {
  return request('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({
      email,
      purpose: 'plan_renew',
      full_name: fullName,
    }),
  })
}

export async function resendLoginOtpApi({ challenge_token }) {
  return request('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({
      purpose: 'login',
      challenge_token,
    }),
  })
}

export async function fetchAuthFeaturesApi() {
  const response = await request('/auth/features')
  return (
    response?.data || {
      payment_otp_enabled: true,
      login_otp_enabled: true,
    }
  )
}

export async function sendPaymentOtpApi({ email, fullName }) {
  return request('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({
      email,
      purpose: 'payment',
      full_name: fullName,
    }),
  })
}

export async function verifyPaymentOtpApi({ email, code }) {
  const response = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      email,
      purpose: 'payment',
      code,
    }),
  })
  return response?.data
}
