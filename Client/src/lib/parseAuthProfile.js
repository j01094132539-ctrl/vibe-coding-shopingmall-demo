/**
 * `GET /api/users/me`·로그인 `data` → 앱 전역 프로필
 * @param {unknown} data
 * @returns {{ name: string, user_type: 'admin' | 'customer' } | null}
 */
export function parseAuthProfile(data) {
  if (data == null || typeof data !== 'object') return null
  const name =
    typeof data.name === 'string' && data.name.trim() !== ''
      ? data.name.trim()
      : null
  if (!name) return null
  const user_type =
    data.user_type === 'admin' || data.user_type === 'customer'
      ? data.user_type
      : 'customer'
  return { name, user_type }
}
