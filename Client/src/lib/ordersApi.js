import { getApiBaseUrl } from '@/lib/api.js'
import { notifyCartUpdated } from '@/lib/cartsApi.js'

export class OrderApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {Record<string, unknown>} payload
   */
  constructor(message, status, payload) {
    super(message)
    this.name = 'OrderApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, token?: string, body?: unknown }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
async function orderFetch(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
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
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new OrderApiError(message, 0, {})
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
    throw new OrderApiError(msg, res.status, payload)
  }

  return payload
}

/**
 * POST /api/orders/me — 장바구니 기반 주문 생성
 * @param {unknown} body
 * @param {string} token
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function createMyOrder(body, token) {
  const payload = await orderFetch('/me', { method: 'POST', token, body })
  notifyCartUpdated()
  const data = payload.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return /** @type {Record<string, unknown>} */ (data)
  }
  return null
}

/**
 * GET /api/orders/me — 내 주문 목록 (주문 완료 페이지 `주문 목록 보기` 연동)
 * @param {string} token
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<{ data: Array<Record<string, unknown>>, meta: Record<string, unknown> }>}
 */
export async function fetchMyOrders(token, params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('limit', String(limit))

  const payload = await orderFetch(`/me?${qs.toString()}`, { token })
  const data = Array.isArray(payload.data) ? payload.data : []
  const meta =
    payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
      ? /** @type {Record<string, unknown>} */ (payload.meta)
      : {}

  return { data, meta }
}

/**
 * GET /api/orders/me/:id — 내 주문 단건 (`/orders/:orderId` 상세)
 * @param {string} orderId
 * @param {string} token
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function fetchMyOrderById(orderId, token) {
  const payload = await orderFetch(
    `/me/${encodeURIComponent(String(orderId).trim())}`,
    { token }
  )
  const data = payload.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return /** @type {Record<string, unknown>} */ (data)
  }
  return null
}
