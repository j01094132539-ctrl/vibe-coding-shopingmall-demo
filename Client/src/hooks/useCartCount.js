import { useCallback, useEffect, useState } from 'react'
import { CART_UPDATED_EVENT, fetchMyCart } from '@/lib/cartsApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'

/** 로그인 시 `GET /api/carts/me`의 totalItems — `AppNavbar` 배지용 */
export function useCartCount(isLoggedIn) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setCount(0)
      return
    }
    const token = readStoredAuthToken()
    if (!token) {
      setCount(0)
      return
    }
    try {
      const cart = await fetchMyCart(token)
      const n = Number(cart?.totalItems)
      setCount(Number.isFinite(n) && n > 0 ? n : 0)
    } catch {
      setCount(0)
    }
  }, [isLoggedIn])

  useEffect(() => {
    refresh()
    window.addEventListener(CART_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh)
  }, [refresh])

  return count
}
