/** `LoginPage`·`Home` 공통 — 토큰·플래시 키 */
export const AUTH_TOKEN_KEY = 'authToken'
export const AUTH_USER_KEY = 'authUser'
export const SIGNUP_FLASH_KEY = 'signupFlash'
export const LOGIN_FLASH_KEY = 'loginFlash'

export function readStoredAuthToken() {
  try {
    const a = localStorage.getItem(AUTH_TOKEN_KEY)
    const b = sessionStorage.getItem(AUTH_TOKEN_KEY)
    const raw =
      (typeof a === 'string' && a.trim() !== '' ? a : null) ||
      (typeof b === 'string' && b.trim() !== '' ? b : null)
    return raw != null ? raw.trim() : ''
  } catch {
    return ''
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_USER_KEY)
  } catch {
    // ignore
  }
}

export function readSignupFlash() {
  try {
    return sessionStorage.getItem(SIGNUP_FLASH_KEY) === '1'
      ? '회원가입이 완료되었습니다.'
      : null
  } catch {
    return null
  }
}

export function readLoginFlash() {
  try {
    const t = sessionStorage.getItem(LOGIN_FLASH_KEY)
    return typeof t === 'string' && t.trim() !== '' ? t.trim() : null
  } catch {
    return null
  }
}

/** 플래시 1회 표시 후 `sessionStorage` 키 제거 */
export function consumeFlashKeys(keys) {
  try {
    for (const key of keys) {
      sessionStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}
