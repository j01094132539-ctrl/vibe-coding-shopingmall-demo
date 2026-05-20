import { getApiBaseUrl } from '@/lib/api.js'

export class AdminOrderApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {Record<string, unknown>} payload
   */
  constructor(message, status, payload) {
    super(message)
    this.name = 'AdminOrderApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, token: string, body?: unknown }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function adminOrderFetch(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` }
  if (body != null) headers['Content-Type'] = 'application/json'

  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/orders${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new AdminOrderApiError(message, 0, {})
  }

  /** @type {Record<string, unknown>} */
  let payload = {}
  try {
    payload = await res.json()
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      (typeof payload.message === 'string' && payload.message) ||
      `요청 실패 (${res.status})`
    throw new AdminOrderApiError(msg, res.status, payload)
  }

  return payload
}

/**
 * GET /api/orders — 관리자 전체 주문 (`AdminOrdersPage`)
 * @param {string} token
 * @param {{ page?: number, limit?: number, status?: string }} [params]
 */
export async function fetchAdminOrders(token, params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50))
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('limit', String(limit))
  if (params.status && String(params.status).trim()) {
    qs.set('status', String(params.status).trim())
  }

  const payload = await adminOrderFetch(`?${qs.toString()}`, { token })
  const data = Array.isArray(payload.data) ? payload.data : []
  const meta =
    payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
      ? /** @type {Record<string, unknown>} */ (payload.meta)
      : {}

  return { data, meta }
}

/**
 * GET /api/orders/:id — 관리자 주문 단건 (`AdminOrderDetailPage`)
 * @param {string} token
 * @param {string} orderId
 */
export async function fetchAdminOrderById(token, orderId) {
  const id = String(orderId || '').trim()
  if (!id) return null
  const payload = await adminOrderFetch(`/${encodeURIComponent(id)}`, { token })
  const data = payload.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return /** @type {Record<string, unknown>} */ (data)
  }
  return null
}

/**
 * PUT /api/orders/:id — 배송 시작·취소 등 (`AdminOrdersPage` 액션)
 * @param {string} token
 * @param {string} orderId
 * @param {Record<string, unknown>} body
 */
export async function updateAdminOrder(token, orderId, body) {
  const id = String(orderId || '').trim()
  const payload = await adminOrderFetch(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body,
  })
  const data = payload.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return /** @type {Record<string, unknown>} */ (data)
  }
  return null
}
