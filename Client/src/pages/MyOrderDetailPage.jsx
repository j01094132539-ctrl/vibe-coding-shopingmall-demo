import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { fetchMyOrderById, OrderApiError } from '@/lib/ordersApi.js'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './checkout.css'

function formatWon(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₩0'
  return `₩${formatPrice(n)}`
}

function formatOrderDate(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** `/orders/:orderId` — 목록 카드의 `주문 상세보기`와 동일 데이터 */
export default function MyOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const token = readStoredAuthToken()
    if (!token) {
      navigate('/login', { replace: true, state: { from: `/orders/${orderId}` } })
      return
    }
    if (!orderId) {
      navigate('/orders', { replace: true })
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchMyOrderById(orderId, token)
      if (!data) {
        setError('주문을 찾을 수 없습니다.')
        setOrder(null)
      } else {
        setOrder(data)
      }
    } catch (err) {
      const msg =
        err instanceof OrderApiError && typeof err.message === 'string'
          ? err.message
          : '주문을 불러오지 못했습니다.'
      setError(msg)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [navigate, orderId])

  useEffect(() => {
    load()
  }, [load])

  const items = order && Array.isArray(order.items) ? order.items : []

  return (
    <div className="order-history">
      <HomeNav />
      <main className="order-history__main order-history__main--narrow">
        <div className="order-history__toolbar">
          <Link to="/orders" className="order-history__back">
            ← 주문 내역
          </Link>
        </div>
        <h1 className="order-history__page-title order-history__page-title--left">주문 상세</h1>

        {loading ? (
          <p className="order-history__hint">불러오는 중…</p>
        ) : error ? (
          <p className="order-history__error" role="alert">
            {error}
          </p>
        ) : order ? (
          <section className="order-history__card" aria-label="주문 정보">
            <header className="order-history__card-head">
              <div className="order-history__card-head-left">
                <span className="order-history__clock" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M12 7v5l3 2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="order-history__order-id">
                    주문 #{typeof order.orderNumber === 'string' ? order.orderNumber : '—'}
                  </p>
                  <p className="order-history__order-date">
                    주문일: {formatOrderDate(order.createdAt)}
                  </p>
                </div>
              </div>
              <div className="order-history__card-head-right">
                <p className="order-history__card-total">{formatWon(order.totalAmount)}</p>
              </div>
            </header>
            <ul className="order-history__lines">
              {items.map((item, index) => {
                const key = item.id || item._id || `line-${index}`
                const name = typeof item.name === 'string' ? item.name : '상품'
                const qty = Number(item.quantity) || 1
                const lineTotal =
                  Number(item.lineTotal) || (Number(item.unitPrice) || 0) * qty
                const img = typeof item.image === 'string' ? item.image.trim() : ''
                const cat = typeof item.category === 'string' ? item.category : ''
                return (
                  <li key={String(key)} className="order-history__line">
                    <div className="order-history__thumb">
                      {img ? (
                        <img src={img} alt="" loading="lazy" />
                      ) : (
                        <span>이미지</span>
                      )}
                    </div>
                    <div className="order-history__line-body">
                      <p className="order-history__line-name">{name}</p>
                      <p className="order-history__line-meta">
                        {cat ? `카테고리: ${cat}` : ''}
                        {cat ? ' · ' : ''}수량: {qty}
                      </p>
                      <p className="order-history__line-price">{formatWon(lineTotal)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  )
}
