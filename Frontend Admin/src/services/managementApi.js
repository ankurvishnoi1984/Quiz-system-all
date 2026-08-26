import { useAuthStore } from '../store/authStore'
import { hostAuthRequest, refreshHostAccessToken } from './hostAuthRequest'

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

export async function assignUserPlanApi(accessToken, userId, planId, planExpiresAt) {
  const body = { plan_id: planId }
  if (planExpiresAt !== undefined) {
    body.plan_expires_at = planExpiresAt || null
  }
  const data = await authRequest(`/users/${userId}/plan`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(body),
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

export async function uploadExtraSeatAttachmentApi(userId, file) {
  const execute = async (afterRefresh = false) => {
    const { accessToken, refreshToken, clearAuth } = useAuthStore.getState()
    if (!accessToken) {
      const err = new Error('Not authenticated')
      err.status = 401
      throw err
    }

    const formData = new FormData()
    formData.append('file', file)

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
    const response = await fetch(`${apiBase}/users/${userId}/extra-participants/attachment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (response.status === 401 && refreshToken && !afterRefresh) {
      try {
        await refreshHostAccessToken()
        return execute(true)
      } catch {
        clearAuth()
        const err = new Error(payload?.message || 'Session expired')
        err.status = 401
        throw err
      }
    }

    if (!response.ok) {
      const err = new Error(payload?.message || 'Attachment upload failed')
      err.status = response.status
      throw err
    }

    return payload?.data || null
  }

  return execute(false)
}

export async function adjustUserExtraParticipantsApi(accessToken, userId, payload) {
  const data = await authRequest(`/users/${userId}/extra-participants`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data?.user
}

export async function listUserExtraQuestionsApi(accessToken, userId) {
  const data = await authRequest(`/users/${userId}/extra-questions`, accessToken)
  return data?.addons || []
}

export async function uploadExtraQuestionAttachmentApi(userId, file) {
  const execute = async (afterRefresh = false) => {
    const { accessToken, refreshToken, clearAuth } = useAuthStore.getState()
    if (!accessToken) {
      const err = new Error('Not authenticated')
      err.status = 401
      throw err
    }

    const formData = new FormData()
    formData.append('file', file)

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
    const response = await fetch(`${apiBase}/users/${userId}/extra-questions/attachment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (response.status === 401 && refreshToken && !afterRefresh) {
      try {
        await refreshHostAccessToken()
        return execute(true)
      } catch {
        clearAuth()
        const err = new Error(payload?.message || 'Session expired')
        err.status = 401
        throw err
      }
    }

    if (!response.ok) {
      const err = new Error(payload?.message || 'Attachment upload failed')
      err.status = response.status
      throw err
    }

    return payload?.data || null
  }

  return execute(false)
}

export async function adjustUserExtraQuestionsApi(accessToken, userId, payload) {
  const data = await authRequest(`/users/${userId}/extra-questions`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data?.user
}

// Legacy public registration (unused by User Management UI).
// export async function registerUserApi(payload) { ... }
