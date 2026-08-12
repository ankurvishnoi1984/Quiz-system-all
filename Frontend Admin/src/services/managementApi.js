import { hostAuthRequest } from './hostAuthRequest'

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function createClientApi(accessToken, payload) {
  const data = await authRequest('/clients', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.client
}

export async function createDepartmentApi(accessToken, payload) {
  const data = await authRequest('/departments', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.department
}

export async function listUsersApi(accessToken) {
  const data = await authRequest('/users', accessToken)
  return data?.users || []
}

export async function createUserApi(accessToken, payload) {
  const data = await authRequest('/users', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

export async function listPlansApi(accessToken) {
  const data = await authRequest('/plans', accessToken)
  return data?.plans || []
}

export async function createPlanApi(accessToken, payload) {
  const data = await authRequest('/plans', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.plan
}

export async function updatePlanApi(accessToken, planId, payload) {
  const data = await authRequest(`/plans/${planId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data?.plan
}

export async function setUserStatusApi(accessToken, userId, isActive) {
  const data = await authRequest(`/users/${userId}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: Boolean(isActive) }),
  })
  return data?.user
}

export async function assignUserPlanApi(accessToken, userId, planId) {
  const data = await authRequest(`/users/${userId}/plan`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ plan_id: planId }),
  })
  return data?.user
}

export async function getPlanUsageApi(accessToken) {
  const data = await authRequest('/plans/usage', accessToken)
  return data?.usage || null
}

export async function listUserExtraParticipantsApi(accessToken, userId) {
  const data = await authRequest(`/users/${userId}/extra-participants`, accessToken)
  return data?.addons || []
}

export async function adjustUserExtraParticipantsApi(accessToken, userId, payload) {
  const data = await authRequest(`/users/${userId}/extra-participants`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data?.user
}

// Legacy public registration (unused by User Management UI).
// export async function registerUserApi(payload) { ... }
