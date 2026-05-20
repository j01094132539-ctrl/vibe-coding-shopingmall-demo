import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  LOGIN_FLASH_KEY,
} from '@/lib/authSession.js'
import { addCartItem, CartApiError } from '@/lib/cartsApi.js'
import { LoginUserError, loginUser } from '@/lib/usersApi.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './login.css'

function IconGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

// Remember me: localStorage / 아니면 sessionStorage — 둘 중 하나만 토큰·유저 유지
function persistSession(rememberMe, token, userJson) {
  const primary = rememberMe ? localStorage : sessionStorage
  const secondary = rememberMe ? sessionStorage : localStorage
  try {
    secondary.removeItem(AUTH_TOKEN_KEY)
    secondary.removeItem(AUTH_USER_KEY)
  } catch {
    // ignore
  }
  try {
    primary.setItem(AUTH_TOKEN_KEY, token)
    primary.setItem(AUTH_USER_KEY, JSON.stringify(userJson))
  } catch {
    // ignore
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    isLoggedIn,
    isInitializing,
    setProfileFromLogin,
  } = useAuthProfile()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** 폼 로그인 직후 `useEffect`가 `/`로 덮어쓰지 않도록 — `구매하기` → `/checkout` 등 */
  const skipLoggedInRedirectRef = useRef(false)

  // Context에서 세션 검증 완료 후 이미 로그인 상태면 홈으로
  useEffect(() => {
    if (!isInitializing && isLoggedIn && !skipLoggedInRedirectRef.current) {
      navigate('/', { replace: true })
    }
  }, [isInitializing, isLoggedIn, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      // 서버 `user.controller.login` — 성공 시 `{ message, data, token }`
      const json = await loginUser({ email: trimmedEmail, password })
      const token = typeof json.token === 'string' ? json.token : ''
      if (!token) {
        setError('서버에서 토큰을 받지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      persistSession(rememberMe, token, json.data ?? null)
      // `setProfileFromLogin` 이후 `useEffect`가 `/`로 보내기 전에 목적지 확정 — `postLoginCheckout`은 프로필 전에 처리
      let nextPath = '/'
      try {
        const raw = sessionStorage.getItem('postLoginCheckout')
        if (raw) {
          sessionStorage.removeItem('postLoginCheckout')
          const parsed = JSON.parse(raw)
          const pid = typeof parsed.product === 'string' ? parsed.product.trim() : ''
          const qty = Number(parsed.quantity)
          if (pid && Number.isFinite(qty) && qty >= 1) {
            try {
              await addCartItem(
                { product: pid, quantity: Math.min(99, Math.floor(qty)) },
                token
              )
              nextPath = '/checkout'
            } catch (cartErr) {
              const cartMsg =
                cartErr instanceof CartApiError && typeof cartErr.message === 'string'
                  ? cartErr.message
                  : '장바구니에 담지 못했습니다.'
              sessionStorage.setItem(LOGIN_FLASH_KEY, `${cartMsg} 홈에서 다시 시도해 주세요.`)
            }
          }
        }
      } catch {
        try {
          sessionStorage.removeItem('postLoginCheckout')
        } catch {
          // ignore
        }
      }
      skipLoggedInRedirectRef.current = true
      setProfileFromLogin(json.data ?? null)
      try {
        // 메인(`Home`)에서 한 번만 표시할 서버 `message` 보관 후 스토리지에서 제거
        const flash =
          typeof json.message === 'string' && json.message.trim() !== ''
            ? json.message
            : '로그인에 성공했습니다.'
        if (!sessionStorage.getItem(LOGIN_FLASH_KEY)) {
          sessionStorage.setItem(LOGIN_FLASH_KEY, flash)
        }
      } catch {
        // ignore
      }
      navigate(nextPath, { replace: true })
      queueMicrotask(() => {
        skipLoggedInRedirectRef.current = false
      })
    } catch (err) {
      const msg =
        err instanceof LoginUserError && typeof err.message === 'string'
          ? err.message
          : err instanceof Error
            ? err.message
            : '로그인에 실패했습니다.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <HomeNav />

      <main className="login__main">
        <div className="login__card">
        {isInitializing ? (
          <p className="login__checking" role="status" aria-live="polite">
            로그인 정보 확인 중…
          </p>
        ) : (
          <>
            <h1 className="login__title">Sign in</h1>
            <p className="login__sub">
              or{' '}
              <Link to="/signup">create an account</Link>
            </p>

            <form className="login__form" onSubmit={handleSubmit} noValidate>
              <div className="login__field">
                <label className="visually-hidden" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  className="login__input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(ev) => {
                    setEmail(ev.target.value)
                    setError('')
                  }}
                />
              </div>

              <div className="login__field">
                <label className="visually-hidden" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className="login__input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(ev) => {
                    setPassword(ev.target.value)
                    setError('')
                  }}
                />
              </div>

              <div className="login__row">
                <label className="login__remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(ev) => setRememberMe(ev.target.checked)}
                  />
                  Remember me
                </label>
              </div>

              {error ? <p className="login__error">{error}</p> : null}

              <button className="login__submit" type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>

              <button
                type="button"
                className="login__google"
                onClick={() => setError('Google sign-in is not set up in this demo.')}
              >
                <IconGoogle />
                Sign in with Google
              </button>
            </form>

            <div className="login__footer">
              <button
                type="button"
                className="login__forgot"
                onClick={() =>
                  setError('Password recovery is not available in this demo.')
                }
              >
                Forgotten your password?
              </button>
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  )
}
