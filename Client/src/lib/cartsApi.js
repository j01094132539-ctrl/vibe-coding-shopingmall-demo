import { getApiBaseUrl } from '@/lib/api.js'

export const CART_UPDATED_EVENT = 'cart-updated'

/** 장바구니 변경 후 네비 배지 갱신용 */
export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export class CartApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'CartApiError'
    this.status = status
    this.payload = payload
  }
}

async function cartFetch(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body != null) headers['Content-Type'] = 'application/json'

  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/carts${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new CartApiError(message, 0, {})
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
    throw new CartApiError(msg, res.status, payload)
  }

  return payload
}

/** GET /api/carts/me */
export async function fetchMyCart(token) {
  const payload = await cartFetch('/me', { token })
  return payload.data && typeof payload.data === 'object' ? payload.data : null
}

/** POST /api/carts/me/items */
export async function addCartItem(body, token) {
  const payload = await cartFetch('/me/items', { method: 'POST', token, body })
  notifyCartUpdated()
  return payload.data
}

/** PUT /api/carts/me/items/:itemId */
export async function updateCartItem(itemId, body, token) {
  const payload = await cartFetch(`/me/items/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    token,
    body,
  })
  notifyCartUpdated()
  return payload.data
}

/** DELETE /api/carts/me/items/:itemId */
export async function removeCartItem(itemId, token) {
  const payload = await cartFetch(`/me/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    token,
  })
  notifyCartUpdated()
  return payload.data
}

/** DELETE /api/carts/me */
export async function clearMyCart(token) {
  const payload = await cartFetch('/me', { method: 'DELETE', token })
  notifyCartUpdated()
  return payload.data
}
