import { Link, Navigate, useLocation } from 'react-router-dom'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './checkout.css'

function formatWon(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₩0'
  return `₩${formatPrice(n)}`
}

/** 주문일 표시 — `createdAt` ISO 또는 Date */
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

function IconCheck() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l5 5L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconFail() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconPackage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function normalizeOrderItems(order) {
  if (!order || !Array.isArray(order.items)) return []
  return order.items.map((item, index) => {
    const qty = Number(item.quantity) || 1
    const lineTotal =
      Number(item.lineTotal) || (Number(item.unitPrice) || 0) * qty
    return {
      key: item.id || item._id || `item-${index}`,
      name: typeof item.name === 'string' ? item.name : '상품',
      category: typeof item.category === 'string' ? item.category : '',
      image: typeof item.image === 'string' ? item.image.trim() : '',
      quantity: qty,
      lineTotal,
    }
  })
}

export default function CheckoutCompletePage() {
  const location = useLocation()
  const state =
    location.state && typeof location.state === 'object' ? location.state : {}

  const isFailed = state.status === 'failed'
  const order = !isFailed && state.order ? state.order : null
  const failMessage =
    typeof state.message === 'string' && state.message.trim()
      ? state.message.trim()
      : '주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

  if (!isFailed && !order) {
    return <Navigate to="/checkout" replace />
  }

  if (isFailed) {
    return (
      <div className="checkout-result checkout-result--failed">
        <HomeNav />
        <main className="checkout-result__main">
          <header className="checkout-result__hero">
            <div
              className="checkout-result__status-icon checkout-result__status-icon--fail"
              aria-hidden
            >
              <IconFail />
            </div>
            <h1 className="checkout-result__title">주문 처리에 실패했습니다</h1>
            <p className="checkout-result__lead">{failMessage}</p>
            <p className="checkout-result__sub">
              결제가 완료된 경우 포트원·고객센터를 통해 결제 내역을 확인해 주세요.
            </p>
          </header>

          <div className="checkout-result__actions">
            <Link to="/checkout" className="checkout-result__btn checkout-result__btn--primary">
              다시 시도하기
            </Link>
            <Link to="/" className="checkout-result__btn checkout-result__btn--outline">
              쇼핑 계속하기
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const orderNumber =
    typeof order.orderNumber === 'string' ? order.orderNumber : ''
  const orderDate = formatOrderDate(order.createdAt)
  const items = normalizeOrderItems(order)

  return (
    <div className="checkout-result checkout-result--success">
      <HomeNav />

      <main className="checkout-result__main">
        <header className="checkout-result__hero">
          <div
            className="checkout-result__status-icon checkout-result__status-icon--success"
            aria-hidden
          >
            <IconCheck />
          </div>
          <h1 className="checkout-result__title">주문이 성공적으로 완료되었습니다!</h1>
          <p className="checkout-result__lead">주문해 주셔서 감사합니다.</p>
          <p className="checkout-result__sub">주문 확인 이메일을 곧 받으실 수 있습니다.</p>
        </header>

        <section className="checkout-result__card" aria-labelledby="checkout-order-info">
          <div className="checkout-result__card-head">
            <span className="checkout-result__card-icon" aria-hidden>
              <IconPackage />
            </span>
            <h2 id="checkout-order-info" className="checkout-result__card-title">
              주문 정보
            </h2>
          </div>

          <div className="checkout-result__meta">
            <div>
              <span className="checkout-result__meta-label">주문 번호</span>
              <span className="checkout-result__meta-value">
                {orderNumber || '—'}
              </span>
            </div>
            <div>
              <span className="checkout-result__meta-label">주문 날짜</span>
              <span className="checkout-result__meta-value">{orderDate}</span>
            </div>
          </div>

          {items.length > 0 ? (
            <ul className="checkout-result__items">
              {items.map((item) => (
                <li key={item.key} className="checkout-result__item">
                  <div className="checkout-result__item-thumb">
                    {item.image ? (
                      <img src={item.image} alt={item.name} loading="lazy" />
                    ) : (
                      <span>이미지 없음</span>
                    )}
                  </div>
                  <div className="checkout-result__item-body">
                    <p className="checkout-result__item-name">{item.name}</p>
                    <p className="checkout-result__item-meta">
                      {item.category ? `${item.category} · ` : ''}
                      수량: {item.quantity}
                    </p>
                    <p className="checkout-result__item-price">{formatWon(item.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="checkout-result__total">
            <span>총 결제 금액</span>
            <strong>{formatWon(order.totalAmount)}</strong>
          </div>
        </section>

        <div className="checkout-result__actions">
          <Link to="/" className="checkout-result__btn checkout-result__btn--primary">
            쇼핑 계속하기
          </Link>
          {/* 주문 성공 후 `GET /api/orders/me` 목록 페이지로 이동 */}
          <Link to="/orders" className="checkout-result__btn checkout-result__btn--secondary">
            주문 목록 보기
          </Link>
          <Link to="/cart" className="checkout-result__btn checkout-result__btn--outline">
            장바구니로
          </Link>
        </div>
      </main>
    </div>
  )
}
