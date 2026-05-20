import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import {
  CartApiError,
  fetchMyCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/cartsApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './cart.css'

/** 캡처 UI — 원화 표기 */
function formatWon(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₩0'
  return `₩${formatPrice(n)}`
}

function getLineProduct(line) {
  const p = line?.product
  if (p && typeof p === 'object') {
    return {
      id: p.id || p._id,
      name: p.name || '상품',
      sku: typeof p.sku === 'string' ? p.sku : '',
      image: p.image || '',
      price: p.price,
    }
  }
  return { id: typeof p === 'string' ? p : '', name: '상품', sku: '', image: '', price: null }
}

export default function CartPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuthProfile()

  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const loadCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(null)
      setLoading(false)
      return
    }
    const token = readStoredAuthToken()
    if (!token) {
      setCart(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchMyCart(token)
      setCart(data)
    } catch (err) {
      const msg =
        err instanceof CartApiError && typeof err.message === 'string'
          ? err.message
          : '장바구니를 불러오지 못했습니다.'
      setError(msg)
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  async function handleQuantityChange(itemId, nextQty) {
    if (nextQty < 1) return
    const token = readStoredAuthToken()
    if (!token) return
    setBusyId(itemId)
    try {
      const data = await updateCartItem(itemId, { quantity: nextQty }, token)
      setCart(data)
      setError('')
    } catch (err) {
      const msg =
        err instanceof CartApiError && typeof err.message === 'string'
          ? err.message
          : '수량 변경에 실패했습니다.'
      setError(msg)
    } finally {
      setBusyId('')
    }
  }

  async function handleRemove(itemId) {
    const token = readStoredAuthToken()
    if (!token) return
    setBusyId(itemId)
    try {
      const data = await removeCartItem(itemId, token)
      setCart(data)
      setError('')
    } catch (err) {
      const msg =
        err instanceof CartApiError && typeof err.message === 'string'
          ? err.message
          : '삭제에 실패했습니다.'
      setError(msg)
    } finally {
      setBusyId('')
    }
  }

  // 결제하기 — `/checkout` 주문(배송) 페이지로 이동
  function handleCheckout() {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    if (items.length === 0) return
    navigate('/checkout')
  }

  const items = Array.isArray(cart?.items) ? cart.items : []
  const totalItems = Number(cart?.totalItems) || 0
  const totalAmount = Number(cart?.totalAmount) || 0

  return (
    <div className="cart-page">
      <HomeNav />

      <main className="cart-page__main">
        <h1 className="cart-page__title">장바구니</h1>

        {!isLoggedIn ? (
          <div className="cart-page__panel cart-page__panel--center">
            <p className="cart-page__hint">
              로그인 후 장바구니를 이용할 수 있습니다.{' '}
              <Link to="/login">로그인</Link>
            </p>
          </div>
        ) : loading ? (
          <p className="cart-page__status" role="status">
            불러오는 중…
          </p>
        ) : error && items.length === 0 ? (
          <p className="cart-page__error" role="alert">
            {error}
          </p>
        ) : items.length === 0 ? (
          <div className="cart-page__panel cart-page__panel--center">
            <p className="cart-page__empty-text">장바구니가 비어 있습니다.</p>
            <Link to="/" className="cart-page__btn cart-page__btn--outline">
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div className="cart-page__layout">
            <section className="cart-page__items" aria-label="장바구니 상품">
              {error ? (
                <p className="cart-page__inline-error" role="alert">
                  {error}
                </p>
              ) : null}

              <ul className="cart-page__list">
                {items.map((line) => {
                  const product = getLineProduct(line)
                  const lineId = line.id || line._id
                  const qty = Number(line.quantity) || 1
                  const unitPrice = Number(line.unitPrice) || Number(product.price) || 0
                  const lineTotal = qty * unitPrice
                  const disabled = busyId === lineId

                  return (
                    <li key={lineId} className="cart-page__card">
                      <Link
                        to={product.id ? `/products/${product.id}` : '/'}
                        className="cart-page__thumb"
                      >
                        {product.image ? (
                          <img src={product.image} alt="" />
                        ) : (
                          <span className="cart-page__thumb-placeholder">IMG</span>
                        )}
                      </Link>

                      <div className="cart-page__card-body">
                        <Link
                          to={product.id ? `/products/${product.id}` : '/'}
                          className="cart-page__name"
                        >
                          {product.name}
                        </Link>
                        {product.sku ? (
                          <p className="cart-page__sku">SKU: {product.sku}</p>
                        ) : null}
                        <p className="cart-page__unit">{formatWon(unitPrice)}</p>

                        <div className="cart-page__qty">
                          <button
                            type="button"
                            className="cart-page__qty-btn"
                            disabled={disabled || qty <= 1}
                            onClick={() => handleQuantityChange(lineId, qty - 1)}
                            aria-label="수량 줄이기"
                          >
                            −
                          </button>
                          <span className="cart-page__qty-value">{qty}</span>
                          <button
                            type="button"
                            className="cart-page__qty-btn"
                            disabled={disabled}
                            onClick={() => handleQuantityChange(lineId, qty + 1)}
                            aria-label="수량 늘리기"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="cart-page__card-aside">
                        <p className="cart-page__line-total">{formatWon(lineTotal)}</p>
                        <button
                          type="button"
                          className="cart-page__remove"
                          disabled={disabled}
                          onClick={() => handleRemove(lineId)}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* 오른쪽 주문 요약 — 수량·금액은 API totalItems/totalAmount 연동 */}
            <aside className="cart-page__order" aria-label="주문 요약">
              <h2 className="cart-page__order-title">주문 요약</h2>

              <div className="cart-page__order-rows">
                <div className="cart-page__order-row">
                  <span>상품 수량 ({totalItems}개)</span>
                  <span>{formatWon(totalAmount)}</span>
                </div>
                <div className="cart-page__order-row">
                  <span>배송비</span>
                  <span className="cart-page__shipping">무료</span>
                </div>
              </div>

              <div className="cart-page__order-total">
                <span>총 결제금액</span>
                <strong>{formatWon(totalAmount)}</strong>
              </div>

              <button
                type="button"
                className="cart-page__btn cart-page__btn--primary"
                onClick={handleCheckout}
              >
                결제하기
              </button>
              <Link to="/" className="cart-page__btn cart-page__btn--outline">
                쇼핑 계속하기
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
