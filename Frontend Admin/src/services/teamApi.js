import { hostAuthRequest } from './hostAuthRequest'

export async function getMyTeamApi(accessToken) {
  const data = await hostAuthRequest('/team', accessToken)
  return data?.team || null
}

export async function addTeamMemberApi(accessToken, payload) {
  return hostAuthRequest('/team/members', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resendTeamMemberVerificationApi(accessToken, memberId) {
  return hostAuthRequest(`/team/members/${memberId}/resend-verification`, accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function removeTeamMemberApi(accessToken, memberId) {
  return hostAuthRequest(`/team/members/${memberId}`, accessToken, {
    method: 'DELETE',
  })
}
