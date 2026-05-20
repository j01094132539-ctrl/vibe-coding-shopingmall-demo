import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '@/lib/api.js'
import {
  LOGIN_FLASH_KEY,
  SIGNUP_FLASH_KEY,
  consumeFlashKeys,
  readLoginFlash,
  readSignupFlash,
} from '@/lib/authSession.js'

/** 홈 전용 — 플래시·백엔드 헬스 (프로필은 `useAuthProfile`) */
export function useHomePageData() {
  const [notice] = useState(readSignupFlash)
  const [loginNotice] = useState(readLoginFlash)
  const [backendText, setBackendText] = useState(null)
  const [backendError, setBackendError] = useState(null)

  useEffect(() => {
    const keys = []
    if (notice) keys.push(SIGNUP_FLASH_KEY)
    if (loginNotice) keys.push(LOGIN_FLASH_KEY)
    if (keys.length) consumeFlashKeys(keys)
  }, [notice, loginNotice])

  useEffect(() => {
    const base = getApiBaseUrl()
    const controller = new AbortController()

    fetch(`${base}/`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        setBackendText(text.trim())
        setBackendError(null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setBackendText(null)
        setBackendError(
          '백엔드에 연결하지 못했습니다. Server에서 npm start(포트 5000)를 실행해 주세요.'
        )
      })

    return () => controller.abort()
  }, [])

  return { notice, loginNotice, backendText, backendError }
}
