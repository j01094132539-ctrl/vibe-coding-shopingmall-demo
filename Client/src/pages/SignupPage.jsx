import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RegisterUserError, registerUser } from '@/lib/usersApi.js'
import './signup.css'

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconEyeOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function IconEyeClosed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.6 6.6C4.5 7.9 3 10 2 12s4 7 10 7c1.9 0 3.6-.4 5.1-1.1M14.1 14.1C13 13.4 11.5 12 9 9 6.5 6 4.4 4.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 5.1A10.3 10.3 0 0 1 12 5c6 0 10 7 10 7a18.8 18.8 0 0 1-2.7 3.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function isStrongPassword(value) {
  if (value.length < 8) return false
  if (!/[A-Za-z]/.test(value)) return false
  if (!/\d/.test(value)) return false
  if (!/[^A-Za-z0-9]/.test(value)) return false
  return true
}

/** 서버 `createUser` / `User.create`에 맞는 JSON 본문 */
function buildCreateUserPayload({ trimmedName, email, password }) {
  return {
    email: email.trim(),
    name: trimmedName,
    password,
    user_type: 'customer',
  }
}

/** `POST /api/users` 호출 → MongoDB에 유저 저장 */
async function saveUserToServer(payload) {
  const json = await registerUser(payload)
  return json
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const allAgreed = agreeTerms && agreePrivacy && agreeMarketing

  const passwordOk = useMemo(() => isStrongPassword(password), [password])
  const passwordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword

  function toggleAgreeAll() {
    const next = !allAgreed
    setAgreeTerms(next)
    setAgreePrivacy(next)
    setAgreeMarketing(next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setSubmitError('이름을 입력해 주세요.')
      return
    }
    if (!email.trim()) {
      setSubmitError('이메일을 입력해 주세요.')
      return
    }
    if (!passwordOk) {
      setSubmitError(
        '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.'
      )
      return
    }
    if (!passwordsMatch) {
      setSubmitError('비밀번호 확인이 일치하지 않습니다.')
      return
    }
    if (!agreeTerms || !agreePrivacy) {
      setSubmitError('필수 약관에 동의해 주세요.')
      return
    }

    const payload = buildCreateUserPayload({
      trimmedName,
      email,
      password,
    })

    setSubmitting(true)
    try {
      await saveUserToServer(payload)
      try {
        sessionStorage.setItem('signupFlash', '1')
      } catch {
        // ignore
      }
      navigate('/')
    } catch (err) {
      let message = '회원가입에 실패했습니다.'
      if (err instanceof RegisterUserError) {
        const errs = err.payload.errors
        if (Array.isArray(errs) && errs.length > 0) {
          message = errs.join('\n')
        } else if (typeof err.message === 'string' && err.message) {
          message = err.message
        }
      } else if (err instanceof Error && err.message) {
        message = err.message
      }
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signup">
      <div className="signup__inner">
        <Link className="signup__back" to="/">
          ← 메인으로
        </Link>

        <header className="signup__head">
          <h1 className="signup__title">회원가입</h1>
          <p className="signup__subtitle">
            새로운 계정을 만들어 쇼핑을 시작하세요
          </p>
        </header>

        <form className="signup__form" onSubmit={handleSubmit} noValidate>
          <div className="signup__field">
            <label className="signup__label" htmlFor="name">
              이름
            </label>
            <div className="signup__control">
              <IconUser />
              <input
                id="name"
                className="signup__input"
                name="name"
                autoComplete="name"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
              />
            </div>
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="email">
              이메일
            </label>
            <div className="signup__control">
              <IconMail />
              <input
                id="email"
                className="signup__input"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
              />
            </div>
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="password">
              비밀번호
            </label>
            <div
              className={`signup__control${password.length > 0 && !passwordOk ? ' signup__control--error' : ''}`}
            >
              <IconLock />
              <input
                id="password"
                className="signup__input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
              />
              <button
                type="button"
                className="signup__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
              </button>
            </div>
            <p className="signup__hint">
              8자 이상, 영문, 숫자, 특수문자 포함
            </p>
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="confirmPassword">
              비밀번호 확인
            </label>
            <div
              className={`signup__control${
                confirmPassword.length > 0 && !passwordsMatch
                  ? ' signup__control--error'
                  : ''
              }`}
            >
              <IconLock />
              <input
                id="confirmPassword"
                className="signup__input"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
              />
              <button
                type="button"
                className="signup__toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showConfirm ? <IconEyeClosed /> : <IconEyeOpen />}
              </button>
            </div>
          </div>

          <hr className="signup__divider" />

          <div className="signup__agreements">
            <label className="signup__check signup__check--all">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={toggleAgreeAll}
              />
              전체 동의
            </label>

            <div className="signup__checkline">
              <label className="signup__check">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(ev) => setAgreeTerms(ev.target.checked)}
                />
                이용약관 동의 (필수)
              </label>
              <button
                type="button"
                className="signup__link"
                onClick={() => setDialog('terms')}
              >
                보기
              </button>
            </div>

            <div className="signup__checkline">
              <label className="signup__check">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(ev) => setAgreePrivacy(ev.target.checked)}
                />
                개인정보처리방침 동의 (필수)
              </label>
              <button
                type="button"
                className="signup__link"
                onClick={() => setDialog('privacy')}
              >
                보기
              </button>
            </div>

            <label className="signup__check">
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(ev) => setAgreeMarketing(ev.target.checked)}
              />
              마케팅 정보 수신 동의 (선택)
            </label>
          </div>

          {submitError ? <p className="signup__error">{submitError}</p> : null}

          <button className="signup__submit" type="submit" disabled={submitting}>
            {submitting ? '저장 중…' : '회원가입하기'}
          </button>
        </form>
      </div>

      {dialog ? (
        <div
          className="signup__overlay"
          role="presentation"
          onClick={() => setDialog(null)}
        >
          <div
            className="signup__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-dialog-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            {dialog === 'terms' ? (
              <>
                <h3 id="signup-dialog-title">이용약관</h3>
                <p>
                  본 약관은 데모 서비스용 예시 문구입니다. 실제 서비스에서는
                  법무 검토를 거친 약관을 게시해야 합니다.
                </p>
              </>
            ) : (
              <>
                <h3 id="signup-dialog-title">개인정보처리방침</h3>
                <p>
                  수집·이용 목적, 보관 기간, 제3자 제공 등을 명시한 방침을
                  데모 환경에 맞게 작성해 주세요.
                </p>
              </>
            )}
            <button type="button" onClick={() => setDialog(null)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
