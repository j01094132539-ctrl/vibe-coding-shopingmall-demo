import { formatPrice } from '@/pages/home/constants.js'

/** 대시보드 최근 주문 — `GET /api/orders` 응답을 카드용으로 변환·`createdAt` 정렬 */
const STATUS_TONE = {
  pending_payment: 'processing',
  paid: 'processing',
  preparing: 'processing',
  shipped: 'shipping',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

function statusLabel(status) {
  switch (status) {
    case 'pending_payment':
      return '결제대기'
    case 'paid':
      return '주문확인'
    case 'preparing':
      return '상품준비중'
    case 'shipped':
      return '배송중'
    case 'delivered':
      return '배송완료'
    case 'cancelled':
      return '주문취소'
    default:
      return '—'
  }
}

function getOrderId(row) {
  if (row.id != null) return String(row.id)
  if (row._id != null) return String(row._id)
  return ''
}

function customerName(order) {
  const s = order.shipping && typeof order.shipping === 'object' ? order.shipping : {}
  const shipName = typeof s.recipientName === 'string' ? s.recipientName.trim() : ''
  const u = order.user && typeof order.user === 'object' ? order.user : {}
  const userName = typeof u.name === 'string' ? u.name.trim() : ''
  return shipName || userName || '—'
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

function formatWon(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₩0'
  return `₩${formatPrice(n)}`
}

function rowCreatedTime(row) {
  const t = row.createdAt
  const d = t ? new Date(t) : null
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0
}

/**
 * `GET /api/orders` 한 건 → 대시보드 카드용 (정렬용 `sortKey` 포함)
 * 최근 주문은 `createdAt` 내림차순으로 맞춤 (`AdminDashboard`에서 slice)
 */
export function mapAdminOrderToRecentCard(row) {
  const status = typeof row.status === 'string' ? row.status : ''
  const tone = STATUS_TONE[status] || 'processing'
  const oid = getOrderId(row)
  const orderNumber = typeof row.orderNumber === 'string' ? row.orderNumber : '—'
  return {
    key: oid || orderNumber,
    to: oid ? `/admin/orders/${encodeURIComponent(oid)}` : '/admin/orders',
    id: orderNumber,
    customer: customerName(row),
    date: formatShortDate(row.createdAt),
    status: tone,
    statusLabel: statusLabel(status),
    amount: formatWon(row.totalAmount),
    sortKey: rowCreatedTime(row),
  }
}

/** `createdAt` 최신순 — 동일 시각은 안정적으로 `orderNumber` 역순 */
export function sortRecentOrdersDesc(rows) {
  return [...rows].sort((a, b) => {
    const t = b.sortKey - a.sortKey
    if (t !== 0) return t
    return String(b.id).localeCompare(String(a.id), 'ko')
  })
}
