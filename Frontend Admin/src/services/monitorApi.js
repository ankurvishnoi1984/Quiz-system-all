import { hostAuthRequest } from './hostAuthRequest'

export async function getWebSocketMonitorApi(accessToken) {
  const data = await hostAuthRequest('/monitor/websockets', accessToken)
  return data?.monitor || null
}

export async function closeWebSocketConnectionsApi(accessToken, payload) {
  const data = await hostAuthRequest('/monitor/websockets/close', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data || { closed_count: 0, closed: [] }
}

export async function blockWebSocketIpApi(accessToken, payload) {
  const data = await hostAuthRequest('/monitor/websockets/block-ip', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data || null
}

export async function unblockWebSocketIpApi(accessToken, payload) {
  const data = await hostAuthRequest('/monitor/websockets/unblock-ip', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data || null
}
