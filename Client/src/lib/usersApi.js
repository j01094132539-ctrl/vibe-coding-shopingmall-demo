import { getApiBaseUrl } from '@/lib/api.js'

/**
 * 회원가입 등 API 실패 시 HTTP 상태·응답 본문을 함께 담습니다.
 */
export class RegisterUserError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {Record<string, unknown>} payload
   */
  constructor(message, status, payload) {
    super(message)
    this.name = 'RegisterUserError'
    this.status = status
    this.payload = payload
  }
}

/**
 * POST /api/users — 서버 `createUser`와 동일한 본문 스키마
 * @param {{ email: string, name: string, password: string, user_type?: string, address?: string }} body
 */
export async function registerUser(body) {
  const res = await fetch(`${getApiBaseUrl()}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

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
    throw new RegisterUserError(msg, res.status, payload)
  }

  return payload
}

/** 로그인 실패 시 HTTP 상태·응답 본문(`message` / `errors`) 보존 */
export class LoginUserError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {Record<string, unknown>} payload
   */
  constructor(message, status, payload) {
    super(message)
    this.name = 'LoginUserError'
    this.status = status
    this.payload = payload
  }
}

/**
 * POST /api/users/login — 서버 `user.controller.login`과 동일 본문·응답 스키마
 * @param {{ email: string, password: string }} body
 * @returns {Promise<{ message?: string, data?: unknown, token?: string }>}
 */
export async function loginUser(body) {
  /** @type {Response} */
  let res
  try {
    // Vite 프록시 `/api` → 백엔드(기본 5000) `POST /api/users/login`
    res = await fetch(`${getApiBaseUrl()}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    // fetch 자체 실패(서버 다운·CORS·오프라인 등) — HTTP 응답이 없을 때
    const message =
      err instanceof TypeError
        ? '네트워크 오류입니다. 서버(포트 5000)가 실행 중인지 확인해 주세요.'
        : '요청을 보내지 못했습니다.'
    throw new LoginUserError(message, 0, {})
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
      (Array.isArray(payload.errors) && payload.errors.length > 0
        ? payload.errors.join('\n')
        : null) ||
      (typeof payload.message === 'string' && payload.message) ||
      `요청 실패 (${res.status})`
    throw new LoginUserError(msg, res.status, payload)
  }

  return payload
}

/**
 * GET /api/users/me — `Authorization: Bearer` + 로그인 JWT (`authenticate` → `getMe`)
 * @param {string} token
 * @returns {Promise<{ data?: { name?: string, email?: string, [key: string]: unknown } }>}
 */
export async function fetchCurrentUser(token) {
  /** @type {Response} */
  let res
  try {
    res = await fetch(`${getApiBaseUrl()}/users/me`, {
      method: 'GET',
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
    throw new LoginUserError(message, 0, {})
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
      (Array.isArray(payload.errors) && payload.errors.length > 0
        ? payload.errors.join('\n')
        : null) ||
      (typeof payload.message === 'string' && payload.message) ||
      `요청 실패 (${res.status})`
    throw new LoginUserError(msg, res.status, payload)
  }

  return payload
}
