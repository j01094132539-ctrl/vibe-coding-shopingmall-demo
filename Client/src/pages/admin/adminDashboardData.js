// 어드민 대시보드 데모 데이터 — 추후 API 연동
export const ADMIN_STATS = [
  {
    id: 'orders',
    label: '총 주문',
    value: '1,234',
    delta: '+12% from last month',
    tone: 'blue',
  },
  {
    id: 'products',
    label: '총 상품',
    value: '156',
    delta: '+8% from last month',
    tone: 'green',
  },
  {
    id: 'customers',
    label: '총 고객',
    value: '2,345',
    delta: '+15% from last month',
    tone: 'purple',
  },
  {
    id: 'revenue',
    label: '총 매출',
    value: '$45,678',
    delta: '+23% from last month',
    tone: 'orange',
  },
]

export const ADMIN_QUICK_ACTIONS = [
  { id: 'new-product', label: '새 상품 등록', primary: true, to: '/admin/products/new' },
  // 상품 목록·편집 진입 — `/admin/products` 라우트와 연결
  { id: 'manage-products', label: '상품 관리', primary: false, to: '/admin/products' },
  // `/admin/orders` 실주문 목록 — `GET /api/orders` + `AdminOrdersPage`
  { id: 'orders', label: '주문 관리', primary: false, to: '/admin/orders' },
  { id: 'sales', label: '매출 분석', primary: false },
  { id: 'customers', label: '고객 관리', primary: false },
]

/** @typedef {'processing' | 'shipping' | 'delivered'} OrderStatus */

/** 데모 최근 주문 — `AdminDashboard`에서 API 실패·토큰 없을 때만 날짜 내림차순으로 표시 */
export const ADMIN_RECENT_ORDERS = [
  {
    id: 'ORD-001234',
    customer: '김민수',
    date: '2024-12-30',
    status: 'processing',
    statusLabel: '처리중',
    amount: '$219',
  },
  {
    id: 'ORD-001233',
    customer: '이영희',
    date: '2024-12-29',
    status: 'shipping',
    statusLabel: '배송중',
    amount: '$156',
  },
  {
    id: 'ORD-001232',
    customer: '박철수',
    date: '2024-12-28',
    status: 'delivered',
    statusLabel: '배송완료',
    amount: '$89',
  },
  {
    id: 'ORD-001231',
    customer: '최지우',
    date: '2024-12-27',
    status: 'processing',
    statusLabel: '처리중',
    amount: '$312',
  },
]
