import { hostAuthRequest } from './hostAuthRequest'

function toQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Super-admin only. Returns { logs, pagination }.
 */
export async function listAuditLogsApi(accessToken, filters = {}) {
  const data = await hostAuthRequest(`/audit-logs${toQuery(filters)}`, accessToken)
  return {
    logs: data?.logs || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 50,
      total: 0,
      total_pages: 0,
    },
  }
}
