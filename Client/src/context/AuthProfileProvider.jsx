import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthProfileContext } from '@/context/authProfileContext.js'
import { clearAuthSession, readStoredAuthToken } from '@/lib/authSession.js'
import { parseAuthProfile } from '@/lib/parseAuthProfile.js'
import { fetchCurrentUser } from '@/lib/usersApi.js'

export function AuthProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [isInitializing, setIsInitializing] = useState(
    () => readStoredAuthToken() !== ''
  )

  const refreshProfile = useCallback(async () => {
    const token = readStoredAuthToken()
    if (!token) {
      setProfile(null)
      setIsInitializing(false)
      return
    }

    setIsInitializing(true)
    try {
      const json = await fetchCurrentUser(token)
      const data = json && typeof json === 'object' ? json.data : null
      setProfile(parseAuthProfile(data))
    } catch {
      clearAuthSession()
      setProfile(null)
    } finally {
      setIsInitializing(false)
    }
  }, [])

  // 앱 시작·새로고침 — JWT가 있으면 `/users/me`로 프로필 동기화(비동기만 setState)
  useEffect(() => {
    let cancelled = false

    async function loadInitialProfile() {
      const token = readStoredAuthToken()
      if (!token) {
        if (!cancelled) {
          setProfile(null)
          setIsInitializing(false)
        }
        return
      }

      try {
        const json = await fetchCurrentUser(token)
        if (cancelled) return
        const data = json && typeof json === 'object' ? json.data : null
        setProfile(parseAuthProfile(data))
      } catch {
        if (cancelled) return
        clearAuthSession()
        setProfile(null)
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }

    loadInitialProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const setProfileFromLogin = useCallback((data) => {
    setProfile(parseAuthProfile(data))
    setIsInitializing(false)
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setProfile(null)
    setIsInitializing(false)
  }, [])

  const value = useMemo(
    () => ({
      profile,
      greetingName: profile?.name ?? null,
      isAdmin: profile?.user_type === 'admin',
      isLoggedIn: profile != null,
      isInitializing,
      setProfileFromLogin,
      logout,
      refreshProfile,
    }),
    [
      profile,
      isInitializing,
      setProfileFromLogin,
      logout,
      refreshProfile,
    ]
  )

  return (
    <AuthProfileContext.Provider value={value}>
      {children}
    </AuthProfileContext.Provider>
  )
}
