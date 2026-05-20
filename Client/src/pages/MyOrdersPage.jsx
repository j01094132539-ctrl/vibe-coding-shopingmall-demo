import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { fetchMyOrders, OrderApiError } from '@/lib/ordersApi.js'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './checkout.css'

/** 탭 필터 — `GET /api/orders/me`의 `status`, 관리자 주문 화면과 동일한 진행 단계 */
const TAB_FILTERS = {
  all: () => true,
  pending_payment: (s) => s === 'pending_payment',
  paid: (s) => s === 'paid',
  preparing: (s) => s === 'preparing',
  /** 배송시작·배송중 UI 구분 없이 API는 `shipped` */
  shipped: (s) => s === 'shipped',
  delivered: (s) => s === 'delivered',
  cancelled: (s) => s === 'cancelled',
}

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'pending_payment', label: '결제대기' },
  { id: 'paid', label: '주문확인' },
  { id: 'preparing', label: '상품준비중' },
  { id: 'shipped', label: '배송중' },
  { id: 'delivered', label: '배송완료' },
  { id: 'cancelled', label: '주문취소' },
]

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

/** 주문일 기준 예상 배송 구간 문구 — 스냅샷에 배송일 필드 없을 때 안내용 */
function formatEstimatedDeliveryRange(createdAt) {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  const start = new Date(d)
  start.setDate(start.getDate() + 5)
  const end = new Date(d)
  end.setDate(end.getDate() + 7)
  const optsShort = /** @type {const} */ ({ month: 'long', day: 'numeric' })
  const a = start.toLocaleDateString('ko-KR', optsShort)
  const b = end.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return `${a} ~ ${b}`
}

function getOrderId(row) {
  if (row.id != null) return String(row.id)
  if (row._id != null) return String(row._id)
  return ''
}

function badgeClassAndLabel(status) {
  switch (status) {
    case 'pending_payment':
      return {
        className: 'order-history__badge order-history__badge--pending-pay',
        label: '결제대기',
      }
    case 'paid':
      return {
        className: 'order-history__badge order-history__badge--processing',
        label: '주문확인',
      }
    case 'preparing':
      return {
        className: 'order-history__badge order-history__badge--processing',
        label: '상품준비중',
      }
    case 'shipped':
      return {
        className: 'order-history__badge order-history__badge--shipping',
        label: '배송중',
      }
    case 'delivered':
      return {
        className: 'order-history__badge order-history__badge--done',
        label: '배송완료',
      }
    case 'cancelled':
      return {
        className: 'order-history__badge order-history__badge--cancelled',
        label: '주문취소',
      }
    default:
      return {
        className: 'order-history__badge order-history__badge--cancelled',
        label: '—',
      }
  }
}

function footerMessage(order) {
  const status = typeof order.status === 'string' ? order.status : ''
  const range = formatEstimatedDeliveryRange(order.createdAt)

  if (status === 'cancelled') {
    return '이 주문은 취소되었습니다.'
  }
  if (status === 'delivered') {
    return '배송이 완료되었습니다. 이용해 주셔서 감사합니다.'
  }
  if (status === 'shipped') {
    return range
      ? `상품을 배송 중입니다. 예상 배송일: ${range}`
      : '상품을 배송 중입니다.'
  }
  if (status === 'pending_payment') {
    return '결제를 확인하고 있습니다.'
  }
  if (status === 'paid' || status === 'preparing') {
    return range
      ? `주문을 처리 중입니다. 예상 배송일: ${range}`
      : '주문을 처리 중입니다.'
  }
  return '주문 상태를 확인 중입니다.'
}

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const token = readStoredAuthToken()
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/orders' } })
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await fetchMyOrders(token, { page: 1, limit: 50 })
      setOrders(data)
    } catch (err) {
      const msg =
        err instanceof OrderApiError && typeof err.message === 'string'
          ? err.message
          : '주문 목록을 불러오지 못했습니다.'
      setError(msg)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const fn = TAB_FILTERS[tab] || TAB_FILTERS.all
    return orders.filter((row) => {
      const s = typeof row.status === 'string' ? row.status : ''
      return fn(s)
    })
  }, [orders, tab])

  // 탭별 건수 — `TABS`·`TAB_FILTERS`와 동기(진행 상태 단계별)
  const tabCounts = useMemo(() => {
    const counts = { all: 0 }
    for (const t of TABS) {
      if (t.id !== 'all') counts[t.id] = 0
    }
    for (const row of orders) {
      const s = typeof row.status === 'string' ? row.status : ''
      counts.all += 1
      for (const t of TABS) {
        if (t.id === 'all') continue
        const fn = TAB_FILTERS[t.id]
        if (fn && fn(s)) counts[t.id] += 1
      }
    }
    return counts
  }, [orders])

  return (
    <div className="order-history">
      <HomeNav />

      <main className="order-history__main">
        <div className="order-history__toolbar">
          <Link to="/" className="order-history__back">
            ← 홈
          </Link>
        </div>

        <h1 className="order-history__page-title">주문 내역</h1>

        <div
          className="order-history__tabs order-history__tabs--scroll"
          role="tablist"
          aria-label="주문 진행 상태"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`order-history__tab${tab === t.id ? ' order-history__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}{' '}
              <span className="order-history__tab-count">({tabCounts[t.id] ?? 0})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="order-history__hint">불러오는 중…</p>
        ) : error ? (
          <p className="order-history__error" role="alert">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div className="order-history__empty-block">
            <p className="order-history__empty">표시할 주문이 없습니다.</p>
            <Link to="/" className="order-history__shop-cta order-history__shop-cta--block">
              쇼핑하러 가기
            </Link>
          </div>
        ) : (
          <ul className="order-history__list">
            {filtered.map((row) => {
              const id = getOrderId(row)
              const orderNumber =
                typeof row.orderNumber === 'string' ? row.orderNumber : '—'
              const total = Number(row.totalAmount) || 0
              const status = typeof row.status === 'string' ? row.status : ''
              const badge = badgeClassAndLabel(status)
              const items = Array.isArray(row.items) ? row.items : []

              return (
                <li key={id || orderNumber} className="order-history__card">
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
                        <p className="order-history__order-id">주문 #{orderNumber}</p>
                        <p className="order-history__order-date">
                          주문일: {formatOrderDate(row.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="order-history__card-head-right">
                      <span className={badge.className}>{badge.label}</span>
                      <p className="order-history__card-total">{formatWon(total)}</p>
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

                  <footer className="order-history__footer">
                    <p className="order-history__footer-msg">{footerMessage(row)}</p>
                    {id ? (
                      <Link to={`/orders/${id}`} className="order-history__detail-btn">
                        주문 상세보기
                      </Link>
                    ) : null}
                  </footer>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
