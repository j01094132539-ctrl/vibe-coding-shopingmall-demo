import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminOrderApiError, fetchAdminOrders } from '@/lib/adminOrdersApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import AdminQuickActions from '@/pages/admin/AdminQuickActions.jsx'
import { ADMIN_RECENT_ORDERS, ADMIN_STATS } from '@/pages/admin/adminDashboardData.js'
import {
  mapAdminOrderToRecentCard,
  sortRecentOrdersDesc,
} from '@/pages/admin/adminDashboardRecentOrders.js'
import { StatIcon } from '@/pages/admin/AdminDashboardIcons.jsx'

/** 데모 `ADMIN_RECENT_ORDERS` — API 실패 시에만 날짜 내림차순으로 표시 */
function sortedFallbackRecent() {
  return [...ADMIN_RECENT_ORDERS]
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .map((o) => ({
      key: o.id,
      to: '/admin/orders',
      id: o.id,
      customer: o.customer,
      date: o.date,
      status: o.status,
      statusLabel: o.statusLabel,
      amount: o.amount,
    }))
}

/** 참고 UI 기반 어드민 대시보드 본문 — 최근 주문은 `GET /api/orders` + `createdAt` 최신순 */
export default function AdminDashboard() {
  const [recentOrders, setRecentOrders] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState('')

  const loadRecent = useCallback(async () => {
    const token = readStoredAuthToken()
    if (!token) {
      setRecentOrders(sortedFallbackRecent())
      setRecentLoading(false)
      setRecentError('')
      return
    }
    setRecentLoading(true)
    setRecentError('')
    try {
      const { data } = await fetchAdminOrders(token, { page: 1, limit: 50 })
      const mapped = sortRecentOrdersDesc(
        (Array.isArray(data) ? data : []).map(mapAdminOrderToRecentCard)
      ).map(({ sortKey: _s, ...card }) => card)
      setRecentOrders(mapped.slice(0, 6))
    } catch (err) {
      const msg =
        err instanceof AdminOrderApiError && typeof err.message === 'string'
          ? err.message
          : '최근 주문을 불러오지 못했습니다.'
      setRecentError(msg)
      setRecentOrders(sortedFallbackRecent())
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const showRecentEmpty = useMemo(
    () => !recentLoading && !recentError && recentOrders.length === 0,
    [recentLoading, recentError, recentOrders.length]
  )

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__head">
        <div>
          <h1 className="admin-dashboard__title">관리자 대시보드</h1>
          <p className="admin-dashboard__sub">
            VIBE MALL 쇼핑몰 관리 시스템에 오신 것을 환영합니다.
          </p>
        </div>
        {/* `/admin/products` 상품 조회·탭 UI로 이동 — AdminPage 본문 상단 진입점 */}
        <Link to="/admin/products" className="admin-dashboard__manage-products">
          상품 관리
        </Link>
      </header>

      <section className="admin-stats" aria-label="요약 통계">
        {ADMIN_STATS.map((stat) => (
          <article
            key={stat.id}
            className={`admin-stat-card admin-stat-card--${stat.tone}`}
          >
            <div className="admin-stat-card__body">
              <p className="admin-stat-card__label">{stat.label}</p>
              <p className="admin-stat-card__value">{stat.value}</p>
              <p className="admin-stat-card__delta">{stat.delta}</p>
            </div>
            <div className="admin-stat-card__icon" aria-hidden>
              <StatIcon tone={stat.tone} />
            </div>
          </article>
        ))}
      </section>

      <section className="admin-panels">
        <AdminQuickActions />

        <section className="admin-orders" aria-labelledby="admin-orders-title">
          <div className="admin-orders__head">
            <h2 id="admin-orders-title" className="admin-panel__title">
              최근 주문
            </h2>
            <Link to="/admin/orders" className="admin-orders__all">
              전체보기
            </Link>
          </div>

          {recentLoading ? (
            <p className="admin-orders__hint" role="status">
              최근 주문 불러오는 중…
            </p>
          ) : null}
          {recentError ? (
            <p className="admin-orders__hint admin-orders__hint--warn" role="alert">
              {recentError} (데모 목록을 표시합니다)
            </p>
          ) : null}
          {showRecentEmpty ? (
            <p className="admin-orders__hint">표시할 주문이 없습니다.</p>
          ) : null}

          <ul className="admin-orders__list">
            {recentOrders.map((order) => (
              <li key={order.key}>
                <Link to={order.to} className="admin-order-card-link">
                  <article className="admin-order-card">
                    <div className="admin-order-card__info">
                      <p className="admin-order-card__id">{order.id}</p>
                      <p className="admin-order-card__customer">{order.customer}</p>
                      <p className="admin-order-card__date">{order.date}</p>
                    </div>
                    <div className="admin-order-card__meta">
                      <span
                        className={`admin-order-badge admin-order-badge--${order.status}`}
                      >
                        {order.statusLabel}
                      </span>
                      <p className="admin-order-card__amount">{order.amount}</p>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  )
}
