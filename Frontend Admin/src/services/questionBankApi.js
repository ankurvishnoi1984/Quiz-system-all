import { hostAuthRequest } from './hostAuthRequest'

function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export async function listQuestionBankTopicsApi(accessToken, params = {}) {
  const data = await hostAuthRequest(
    `/question-bank/topics${queryString(params)}`,
    accessToken,
  )
  return data?.topics || []
}

export async function createQuestionBankTopicApi(accessToken, payload) {
  const data = await hostAuthRequest('/question-bank/topics', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.topic
}

export async function updateQuestionBankTopicApi(accessToken, topicId, payload) {
  const data = await hostAuthRequest(`/question-bank/topics/${topicId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data?.topic
}

export async function listQuestionBankQuestionsApi(accessToken, params = {}) {
  return hostAuthRequest(
    `/question-bank/questions${queryString(params)}`,
    accessToken,
  )
}

export async function createQuestionBankQuestionApi(accessToken, payload) {
  const data = await hostAuthRequest('/question-bank/questions', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.question
}

export async function updateQuestionBankQuestionApi(accessToken, questionId, payload) {
  const data = await hostAuthRequest(
    `/question-bank/questions/${questionId}`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
  return data?.question
}

export async function submitQuestionBankQuestionApi(accessToken, questionId) {
  const data = await hostAuthRequest(
    `/question-bank/questions/${questionId}/submit`,
    accessToken,
    { method: 'POST' },
  )
  return data?.question
}

export async function reviewQuestionBankQuestionApi(
  accessToken,
  questionId,
  payload,
) {
  const data = await hostAuthRequest(
    `/question-bank/questions/${questionId}/review`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data?.question
}

export async function archiveQuestionBankQuestionApi(accessToken, questionId) {
  const data = await hostAuthRequest(
    `/question-bank/questions/${questionId}/archive`,
    accessToken,
    { method: 'POST' },
  )
  return data?.question
}

export async function reviseQuestionBankQuestionApi(accessToken, questionId) {
  const data = await hostAuthRequest(
    `/question-bank/questions/${questionId}/revise`,
    accessToken,
    { method: 'POST' },
  )
  return data?.question
}

export async function addQuestionBankQuestionsToSessionApi(
  accessToken,
  sessionId,
  bankQuestionIds,
) {
  return hostAuthRequest(`/question-bank/sessions/${sessionId}/add`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ bank_question_ids: bankQuestionIds }),
  })
}

export async function addRandomQuestionBankQuestionsApi(
  accessToken,
  sessionId,
  payload,
) {
  return hostAuthRequest(
    `/question-bank/sessions/${sessionId}/random`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}
