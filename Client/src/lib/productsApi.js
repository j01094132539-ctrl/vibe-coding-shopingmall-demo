import { getApiBaseUrl } from '@/lib/api.js'

export const PRODUCT_CATEGORIES = ['상의', '하의', '악세사리']

export class ProductApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {Record<string, unknown>} payload
   */
  constructor(message, status, payload) {
    super(message)
    this.name = 'ProductApiError'
    this.status = status
    this.payload = payload
  }
}

/** 목록 API 기본 페이지 크기 — 서버 `GET /api/products`와 동일 */
export const PRODUCT_LIST_PAGE_SIZE = 2

/**
 * @typedef {{ page: number, limit: number, total: number, totalPages: number }} ProductListMeta
 */

/**
 * 공개 `GET /api/products` — `page`·`limit`(기본 2)·`category`·`search` 쿼리
 * @param {{ page?: number, limit?: number, category?: string, search?: string }} [params]
 * @returns {Promise<{ data: Array<Record<string, unknown>>, meta: ProductListMeta }>}
 */
export async function fetchProductList(params = {}) {
  const page = Number.isFinite(Number(params.page)) && Number(params.page) >= 1 ? Number(params.page) : 1
  const limit =
    Number.isFinite(Number(params.limit)) && Number(params.limit) >= 1
      ? Number(params.limit)
      : PRODUCT_LIST_PAGE_SIZE
  const category = typeof params.category === 'string' ? params.category.trim() : ''
  const search = typeof params.search === 'string' ? params.search.trim() : ''

  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('limit', String(limit))
  if (category) qs.set('category', category)
  if (search) qs.set('search', search)

  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/products?${qs.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new ProductApiError(message, 0, {})
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
    throw new ProductApiError(msg, res.status, payload)
  }

  const data = payload.data
  const list = Array.isArray(data) ? data : []
  const rawMeta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
  const meta = {
    page: Number.isFinite(Number(rawMeta.page)) ? Number(rawMeta.page) : page,
    limit: Number.isFinite(Number(rawMeta.limit)) ? Number(rawMeta.limit) : limit,
    total: Number.isFinite(Number(rawMeta.total)) ? Number(rawMeta.total) : list.length,
    totalPages: Number.isFinite(Number(rawMeta.totalPages))
      ? Number(rawMeta.totalPages)
      : Math.ceil(list.length / limit) || 0,
  }

  return { data: list, meta }
}

/** 홈 등에서 전체 목록 — `GET /api/products` 페이지를 limit 50으로 순회 */
export async function fetchAllProducts() {
  return fetchAllProductsFiltered({})
}

/** `?category=` 필터로 전체 페이지 수집 — 카테고리 목록 화면용 */
export async function fetchAllProductsByCategory(category) {
  const cat = typeof category === 'string' ? category.trim() : ''
  if (!cat || !PRODUCT_CATEGORIES.includes(cat)) return []
  return fetchAllProductsFiltered({ category: cat })
}

async function fetchAllProductsFiltered({ category = '', search = '' } = {}) {
  const limitPerPage = 50
  const merged = []
  let page = 1
  let totalPages = 1
  do {
    const { data, meta } = await fetchProductList({
      page,
      limit: limitPerPage,
      category,
      search,
    })
    merged.push(...data)
    totalPages = meta.totalPages
    page += 1
  } while (page <= totalPages && totalPages > 0)
  return merged
}

/**
 * 공개 `GET /api/products/:id` — 상품 수정 폼 프리필 등
 * @param {string} id Mongo ObjectId 문자열
 */
export async function fetchProductById(id) {
  const encoded = encodeURIComponent(String(id).trim())
  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/products/${encoded}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new ProductApiError(message, 0, {})
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
    throw new ProductApiError(msg, res.status, payload)
  }

  return payload.data && typeof payload.data === 'object' ? payload.data : null
}

/**
 * PUT /api/products/:id — 관리자 JWT
 * @param {string} id
 * @param {object} body
 * @param {string} token
 */
export async function updateProduct(id, body, token) {
  const encoded = encodeURIComponent(String(id).trim())
  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/products/${encoded}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new ProductApiError(message, 0, {})
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
      (Array.isArray(payload.errors) && payload.errors.join('\n')) ||
      (typeof payload.message === 'string' && payload.message) ||
      `요청 실패 (${res.status})`
    throw new ProductApiError(msg, res.status, payload)
  }

  return payload
}

/**
 * DELETE /api/products/:id — 관리자 JWT
 * @param {string} id
 * @param {string} token
 */
export async function deleteProduct(id, token) {
  const encoded = encodeURIComponent(String(id).trim())
  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/products/${encoded}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new ProductApiError(message, 0, {})
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
    throw new ProductApiError(msg, res.status, payload)
  }

  return payload
}

/**
 * POST /api/products — 관리자 JWT (`authenticate` + `requireAdmin`)
 * @param {object} body
 * @param {string} token
 */
export async function createProduct(body, token) {
  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new ProductApiError(message, 0, {})
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
      (Array.isArray(payload.errors) && payload.errors.join('\n')) ||
      (typeof payload.message === 'string' && payload.message) ||
      `요청 실패 (${res.status})`
    throw new ProductApiError(msg, res.status, payload)
  }

  return payload
}
