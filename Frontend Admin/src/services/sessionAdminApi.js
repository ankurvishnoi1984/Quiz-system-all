import { hostAuthRequest } from './hostAuthRequest'

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function getSessionAdminDashboardApi(accessToken) {
  return authRequest('/session-admin/dashboard', accessToken)
}

export async function changeSessionAdminPasswordApi(accessToken, sessionId, newPassword) {
  const data = await authRequest(`/session-admin/sessions/${sessionId}/password`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })
  return data?.session_admin || null
}

export async function changeOwnSessionAdminPasswordApi(accessToken, newPassword) {
  const data = await authRequest('/session-admin/password', accessToken, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })
  return data?.session_admin || null
}

export async function activateAllSessionAdminQuestionsApi(accessToken) {
  return authRequest('/session-admin/activate-all-questions', accessToken, {
    method: 'POST',
  })
}

export async function deactivateAllSessionAdminQuestionsApi(accessToken) {
  return authRequest('/session-admin/deactivate-all-questions', accessToken, {
    method: 'POST',
  })
}
