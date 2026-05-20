import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import {
  AdminOrderApiError,
  fetchAdminOrders,
  updateAdminOrder,
} from '@/lib/adminOrdersApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import '../admin.css'
import '../home.css'
import './admin-orders.css'

/** 탭 필터 — `GET /api/orders`의 `status`, 카드 진행 상태 드롭다운 단계와 동일 */
const TAB_FILTERS = {
  all: () => true,
  pending_payment: (s) => s === 'pending_payment',
  paid: (s) => s === 'paid',
  preparing: (s) => s === 'preparing',
  /** 배송시작·배송중 드롭 옵션은 모두 API `shipped` */
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

function formatShortDate(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 취소 정보 패널 — `order.model`의 `cancelledAt` 표시용 */
function formatCancelledDateTime(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleString('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return formatShortDate(value)
  }
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
        className: 'admin-om__badge admin-om__badge--pending',
        label: '결제대기',
      }
    case 'paid':
      return {
        className: 'admin-om__badge admin-om__badge--processing',
        label: '주문확인',
      }
    case 'preparing':
      return {
        className: 'admin-om__badge admin-om__badge--processing',
        label: '상품준비중',
      }
    case 'shipped':
      return {
        className: 'admin-om__badge admin-om__badge--shipping',
        label: '배송중',
      }
    case 'delivered':
      return {
        className: 'admin-om__badge admin-om__badge--done',
        label: '배송완료',
      }
    case 'cancelled':
      return {
        className: 'admin-om__badge admin-om__badge--cancelled',
        label: '주문취소',
      }
    default:
      return { className: 'admin-om__badge admin-om__badge--cancelled', label: '—' }
  }
}

function buildShippingLine(order) {
  const s = order.shipping && typeof order.shipping === 'object' ? order.shipping : {}
  const line1 = typeof s.addressLine1 === 'string' ? s.addressLine1.trim() : ''
  const line2 = typeof s.addressLine2 === 'string' ? s.addressLine2.trim() : ''
  const zip = typeof s.postalCode === 'string' ? s.postalCode.trim() : ''
  const parts = [zip, line1, line2].filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

function customerPhone(order) {
  const s = order.shipping && typeof order.shipping === 'object' ? order.shipping : {}
  return typeof s.phone === 'string' ? s.phone.trim() : '—'
}

function customerName(order) {
  const s = order.shipping && typeof order.shipping === 'object' ? order.shipping : {}
  const shipName = typeof s.recipientName === 'string' ? s.recipientName.trim() : ''
  const u = order.user && typeof order.user === 'object' ? order.user : {}
  const userName = typeof u.name === 'string' ? u.name.trim() : ''
  return shipName || userName || '—'
}

function customerEmail(order) {
  const u = order.user && typeof order.user === 'object' ? order.user : {}
  return typeof u.email === 'string' ? u.email.trim() : '—'
}

function itemCountLabel(order) {
  const n = Number(order.totalItems)
  if (Number.isFinite(n) && n >= 0) return `${n}개 상품`
  const items = Array.isArray(order.items) ? order.items.length : 0
  return `${items}개 상품`
}

/**
 * 카드별 드롭다운 — UI 값과 `PUT /api/orders/:id` body.status (`shipped`는 라벨 2종)
 * 이미지: 주문확인·상품준비중·배송시작·배송중·배송완료·주문취소 + 결제대기
 */
const ADMIN_LIST_STATUS_OPTIONS = [
  { value: 'pending_payment', apiStatus: 'pending_payment', label: '결제대기' },
  { value: 'paid', apiStatus: 'paid', label: '주문확인' },
  { value: 'preparing', apiStatus: 'preparing', label: '상품준비중' },
  { value: 'shipped_start', apiStatus: 'shipped', label: '배송시작' },
  { value: 'shipped_in', apiStatus: 'shipped', label: '배송중' },
  { value: 'delivered', apiStatus: 'delivered', label: '배송완료' },
  { value: 'cancelled', apiStatus: 'cancelled', label: '주문취소' },
]

function listSelectUiValue(orderStatus) {
  const s = typeof orderStatus === 'string' ? orderStatus : ''
  if (s === 'shipped') return 'shipped_start'
  const found = ADMIN_LIST_STATUS_OPTIONS.find((o) => o.apiStatus === s)
  return found ? found.value : 'pending_payment'
}

/** `/admin/orders` — 캡처 UI: 검색·탭·카드·상태 드롭다운 */
export default function AdminOrdersPage() {
  const navigate = useNavigate()
  const { isAdmin, isInitializing } = useAuthProfile()
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    if (isInitializing) return
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isInitializing, navigate])

  const load = useCallback(async () => {
    const token = readStoredAuthToken()
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/admin/orders' } })
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await fetchAdminOrders(token, { page: 1, limit: 100 })
      setOrders(data)
    } catch (err) {
      const msg =
        err instanceof AdminOrderApiError && typeof err.message === 'string'
          ? err.message
          : '주문 목록을 불러오지 못했습니다.'
      setError(msg)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!isInitializing && isAdmin) {
      load()
    }
  }, [isAdmin, isInitializing, load])

  const filtered = useMemo(() => {
    const fn = TAB_FILTERS[tab] || TAB_FILTERS.all
    const q = search.trim().toLowerCase()
    return orders.filter((row) => {
      const s = typeof row.status === 'string' ? row.status : ''
      if (!fn(s)) return false
      if (!q) return true
      const on =
        typeof row.orderNumber === 'string' ? row.orderNumber.toLowerCase() : ''
      const u = row.user && typeof row.user === 'object' ? row.user : {}
      const name = typeof u.name === 'string' ? u.name.toLowerCase() : ''
      const email = typeof u.email === 'string' ? u.email.toLowerCase() : ''
      const recipient = customerName(row).toLowerCase()
      return on.includes(q) || name.includes(q) || email.includes(q) || recipient.includes(q)
    })
  }, [orders, tab, search])

  // 로드된 목록 기준 탭별 건수 — `TABS`·`TAB_FILTERS`와 동기(진행 상태 단계별)
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

  // 카드에서 드롭다운으로 `PUT /api/orders/:id` 상태 변경 (배송시작·배송중은 동일 api `shipped`)
  async function handleRowStatusChange(orderId, currentApiStatus, uiValue) {
    const opt = ADMIN_LIST_STATUS_OPTIONS.find((o) => o.value === uiValue)
    if (!opt) return
    const nextApi = opt.apiStatus
    if (nextApi === currentApiStatus) return

    if (nextApi === 'cancelled') {
      const ok = window.confirm('주문을 취소할까요?')
      if (!ok) return
    }

    const token = readStoredAuthToken()
    if (!token) return
    setBusyId(orderId)
    try {
      const body =
        nextApi === 'cancelled'
          ? { status: 'cancelled', cancelReason: '관리자 상태 변경' }
          : { status: nextApi }
      await updateAdminOrder(token, orderId, body)
      await load()
    } catch (err) {
      const msg =
        err instanceof AdminOrderApiError && typeof err.message === 'string'
          ? err.message
          : '상태를 변경하지 못했습니다.'
      window.alert(msg)
    } finally {
      setBusyId('')
    }
  }

  if (!isInitializing && !isAdmin) return null

  return (
    <div className="admin-page">
      <HomeNav />
      <main className="admin-page__main admin-om">
        {isInitializing ? (
          <p className="admin-page__checking" role="status">
            권한 확인 중…
          </p>
        ) : (
          <>
            <header className="admin-om__header">
              <Link to="/admin" className="admin-om__back" aria-label="관리자 대시보드로">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <h1 className="admin-om__title">주문 관리</h1>
            </header>

            <div className="admin-om__search-row">
              <div className="admin-om__search">
                <span className="admin-om__search-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M16 16l4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  type="search"
                  className="admin-om__search-input"
                  placeholder="주문번호 또는 고객명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="주문 검색"
                />
              </div>
              <button
                type="button"
                className="admin-om__filter-btn"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((v) => !v)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 6h16M7 12h10M10 18h4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                필터
              </button>
            </div>

            {filterOpen ? (
              <p className="admin-om__filter-hint">
                탭은 주문의 진행 상태(결제대기~주문취소)와 동일하게 구분됩니다. 검색은 현재 탭 목록만
                좁힙니다.
              </p>
            ) : null}

            <div
              className="admin-om__tabs admin-om__tabs--scroll"
              role="tablist"
              aria-label="주문 진행 상태"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`admin-om__tab${tab === t.id ? ' admin-om__tab--active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}{' '}
                  <span className="admin-om__tab-count">({tabCounts[t.id] ?? 0})</span>
                </button>
              ))}
            </div>

            {loading ? (
              <p className="admin-om__hint">불러오는 중…</p>
            ) : error ? (
              <p className="admin-om__error" role="alert">
                {error}
              </p>
            ) : filtered.length === 0 ? (
              <p className="admin-om__hint">표시할 주문이 없습니다.</p>
            ) : (
              <ul className="admin-om__list">
                {filtered.map((row) => {
                  const id = getOrderId(row)
                  const orderNumber =
                    typeof row.orderNumber === 'string' ? row.orderNumber : '—'
                  const status = typeof row.status === 'string' ? row.status : ''
                  const badge = badgeClassAndLabel(status)
                  const total = Number(row.totalAmount) || 0
                  const name = customerName(row)
                  const dateStr = formatShortDate(row.createdAt)
                  const busy = busyId === id
                  const selectUi = listSelectUiValue(status)

                  return (
                    <li key={id || orderNumber} className="admin-om__card">
                      <div className="admin-om__card-head">
                        <div className="admin-om__card-head-left">
                          <span className="admin-om__clock" aria-hidden>
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
                            <p className="admin-om__order-no">{orderNumber}</p>
                            <p className="admin-om__customer-date">
                              {name} · {dateStr}
                            </p>
                          </div>
                        </div>
                        <div className="admin-om__card-head-right">
                          <span className={badge.className}>{badge.label}</span>
                          <p className="admin-om__card-total">{formatWon(total)}</p>
                          {id ? (
                            <Link
                              to={`/admin/orders/${id}`}
                              className="admin-om__detail-link"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path
                                  d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                              상세보기
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="admin-om__cols">
                        <div className="admin-om__col">
                          <p className="admin-om__col-title">고객 정보</p>
                          <p className="admin-om__col-line">{customerEmail(row)}</p>
                          <p className="admin-om__col-line">{customerPhone(row)}</p>
                        </div>
                        <div className="admin-om__col">
                          <p className="admin-om__col-title">주문 상품</p>
                          <p className="admin-om__col-line">{itemCountLabel(row)}</p>
                        </div>
                        <div className="admin-om__col">
                          <p className="admin-om__col-title">배송 주소</p>
                          <p className="admin-om__col-line admin-om__col-line--address">
                            {buildShippingLine(row)}
                          </p>
                        </div>
                      </div>

                      {status === 'cancelled' ? (
                        <div
                          className="admin-om__cancel-panel"
                          role="region"
                          aria-label="취소 정보"
                        >
                          <p className="admin-om__cancel-panel-title">취소 정보</p>
                          <dl className="admin-om__cancel-dl">
                            <div className="admin-om__cancel-dl-row">
                              <dt>취소 일시</dt>
                              <dd>{formatCancelledDateTime(row.cancelledAt)}</dd>
                            </div>
                            <div className="admin-om__cancel-dl-row">
                              <dt>취소 사유</dt>
                              <dd>
                                {typeof row.cancelReason === 'string' &&
                                row.cancelReason.trim()
                                  ? row.cancelReason.trim()
                                  : '—'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ) : null}

                      <div className="admin-om__actions">
                        <label className="admin-om__card-status-label" htmlFor={`order-status-${id}`}>
                          진행 상태
                        </label>
                        <div className="admin-om__card-select-wrap">
                          <select
                            id={`order-status-${id}`}
                            className="admin-om__status-select"
                            value={selectUi}
                            disabled={busy || !id}
                            onChange={(e) =>
                              handleRowStatusChange(id, status, e.target.value)
                            }
                          >
                            {ADMIN_LIST_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}
