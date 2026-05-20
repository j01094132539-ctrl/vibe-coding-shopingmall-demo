import { Routes, Route } from 'react-router-dom'
import { AuthProfileProvider } from '@/context/AuthProfileProvider.jsx'
import Home from '@/pages/Home.jsx'
import ProductDetailPage from '@/pages/ProductDetailPage.jsx'
import LoginPage from '@/pages/LoginPage.jsx'
import SignupPage from '@/pages/SignupPage.jsx'
import AdminPage from '@/pages/AdminPage.jsx'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage.jsx'
import AdminOrderDetailPage from '@/pages/admin/AdminOrderDetailPage.jsx'
import ProductManagePage from '@/pages/admin/ProductManagePage.jsx'
import ProductRegisterPage from '@/pages/admin/ProductRegisterPage.jsx'
import CartPage from '@/pages/CartPage.jsx'
import CheckoutPage from '@/pages/CheckoutPage.jsx'
import CheckoutCompletePage from '@/pages/CheckoutCompletePage.jsx'
import MyOrdersPage from '@/pages/MyOrdersPage.jsx'
import MyOrderDetailPage from '@/pages/MyOrderDetailPage.jsx'
import CategoryPage from '@/pages/CategoryPage.jsx'
import './App.css'

export default function App() {
  return (
    <AuthProfileProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* 네비 카테고리 — `GET /api/products?category=` */}
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        {/* 네비 장바구니 — `GET /api/carts/me` */}
        <Route path="/cart" element={<CartPage />} />
        {/* 장바구니 결제하기 → 배송·주문 요약 `CheckoutPage` */}
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/complete" element={<CheckoutCompletePage />} />
        {/* 주문 완료 화면 `주문 목록 보기` → `GET /api/orders/me` */}
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/orders/:orderId" element={<MyOrderDetailPage />} />
        {/* 백엔드 `POST /api/users/login`과 연동된 로그인 UI */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* 홈 네비 `어드민` — `user_type === 'admin'`일 때만 노출 */}
        <Route path="/admin" element={<AdminPage />} />
        {/* 관리자 `GET /api/orders`·`PUT /api/orders/:id` — 주문 관리 UI */}
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
        <Route path="/admin/products" element={<ProductManagePage />} />
        <Route path="/admin/products/new" element={<ProductRegisterPage />} />
      </Routes>
    </AuthProfileProvider>
  )
}
