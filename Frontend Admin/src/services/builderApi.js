import { hostAuthRequest } from './hostAuthRequest'

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function getSessionDetailApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}`, accessToken)
  return data?.session || null
}

export async function listQuestionSetsApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/question-sets`, accessToken)
  return data?.sets || []
}

export async function createQuestionSetApi(accessToken, sessionId, name) {
  const data = await authRequest(`/sessions/${sessionId}/question-sets`, accessToken, {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {}),
  })
  return data?.set || null
}

export async function updateQuestionSetApi(accessToken, sessionId, setId, name) {
  const data = await authRequest(`/sessions/${sessionId}/question-sets/${setId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
  return data?.set || null
}

export async function deleteQuestionSetApi(accessToken, sessionId, setId) {
  await authRequest(`/sessions/${sessionId}/question-sets/${setId}`, accessToken, {
    method: 'DELETE',
  })
}

export async function listSessionQuestionsApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/questions`, accessToken)
  return data?.questions || []
}

export async function createQuestionApi(accessToken, sessionId, payload) {
  const data = await authRequest(`/sessions/${sessionId}/questions`, accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.question || null
}

export async function previewQuestionImportApi(
  accessToken,
  sessionId,
  { filename, rows },
  mode = 'append',
) {
  return authRequest(`/sessions/${sessionId}/questions/import/preview`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ filename, rows, mode }),
  })
}

export async function importQuestionsApi(
  accessToken,
  sessionId,
  { mode = 'append', questions = [] },
) {
  return authRequest(`/sessions/${sessionId}/questions/import`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ mode, questions }),
  })
}

export async function updateQuestionApi(accessToken, questionId, payload) {
  const data = await authRequest(`/questions/${questionId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data?.question || null
}

export async function deleteQuestionApi(accessToken, questionId) {
  await authRequest(`/questions/${questionId}`, accessToken, {
    method: 'DELETE',
  })
}

export async function reorderQuestionsApi(accessToken, sessionId, orderedIds) {
  const data = await authRequest('/questions/reorder', accessToken, {
    method: 'POST',
    body: JSON.stringify({ sessionId: Number(sessionId), orderedIds }),
  })
  return data?.questions || []
}

export async function updateSessionApi(accessToken, sessionId, payload) {
  const data = await authRequest(`/sessions/${sessionId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data?.session || null
}

export async function listDepartmentSessionsApi(accessToken, deptId) {
  const data = await authRequest(`/departments/${deptId}/sessions`, accessToken)
  return data?.sessions || []
}
