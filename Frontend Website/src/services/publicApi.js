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

export async function confirmPaymentApi(payload) {
  const response = await request('/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data?.payment
}
