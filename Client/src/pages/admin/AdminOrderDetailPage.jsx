import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import {
  AdminOrderApiError,
  fetchAdminOrderById,
} from '@/lib/adminOrdersApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import '../admin.css'
import '../home.css'
import './admin-orders.css'

function formatWon(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₩0'
  return `₩${formatPrice(n)}`
}

/** `/admin/orders/:orderId` — 관리자 단건 조회 `GET /api/orders/:id` */
export default function AdminOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isInitializing } = useAuthProfile()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isInitializing) return
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isInitializing, navigate])

  const load = useCallback(async () => {
    const token = readStoredAuthToken()
    if (!token) {
      navigate('/login', { replace: true, state: { from: `/admin/orders/${orderId}` } })
      return
    }
    if (!orderId) {
      navigate('/admin/orders', { replace: true })
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminOrderById(token, orderId)
      if (!data) {
        setError('주문을 찾을 수 없습니다.')
        setOrder(null)
      } else {
        setOrder(data)
      }
    } catch (err) {
      const msg =
        err instanceof AdminOrderApiError && typeof err.message === 'string'
          ? err.message
          : '주문을 불러오지 못했습니다.'
      setError(msg)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [navigate, orderId])

  useEffect(() => {
    if (!isInitializing && isAdmin) {
      load()
    }
  }, [isAdmin, isInitializing, load])

  if (!isInitializing && !isAdmin) return null

  const items = order && Array.isArray(order.items) ? order.items : []

  return (
    <div className="admin-page">
      <HomeNav />
      <main className="admin-page__main admin-om admin-om--detail">
        <header className="admin-om__header">
          <Link to="/admin/orders" className="admin-om__back" aria-label="주문 목록으로">
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
          <h1 className="admin-om__title">주문 상세</h1>
        </header>

        {loading ? (
          <p className="admin-om__hint">불러오는 중…</p>
        ) : error ? (
          <p className="admin-om__error" role="alert">
            {error}
          </p>
        ) : order ? (
          <section className="admin-om__detail-card">
            <p className="admin-om__detail-row">
              <strong>주문번호</strong>{' '}
              {typeof order.orderNumber === 'string' ? order.orderNumber : '—'}
            </p>
            <p className="admin-om__detail-row">
              <strong>상태</strong> {typeof order.status === 'string' ? order.status : '—'}
            </p>
            <p className="admin-om__detail-row">
              <strong>합계</strong> {formatWon(order.totalAmount)}
            </p>
            <h2 className="admin-om__detail-sub">상품</h2>
            <ul className="admin-om__detail-items">
              {items.map((item, i) => (
                <li key={String(item.id || item._id || i)}>
                  {typeof item.name === 'string' ? item.name : '상품'} ×{' '}
                  {Number(item.quantity) || 0}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  )
}
