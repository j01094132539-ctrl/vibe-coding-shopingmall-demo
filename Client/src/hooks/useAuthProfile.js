import { useContext } from 'react'
import { AuthProfileContext } from '@/context/authProfileContext.js'

export function useAuthProfile() {
  const ctx = useContext(AuthProfileContext)
  if (ctx == null) {
    throw new Error('useAuthProfile은 AuthProfileProvider 안에서만 사용할 수 있습니다.')
  }
  return ctx
}
