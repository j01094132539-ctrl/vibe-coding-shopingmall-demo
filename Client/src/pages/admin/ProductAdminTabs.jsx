import { NavLink } from 'react-router-dom'
import './product-manage.css'

/** 상품 목록 / 상품 등록 탭 — `ProductManagePage`·`ProductRegisterPage` 공통 */
export default function ProductAdminTabs() {
  return (
    <div className="pm-tabs" role="tablist" aria-label="상품 메뉴">
      <NavLink
        to="/admin/products"
        end
        className={({ isActive }) => `pm-tab${isActive ? ' pm-tab--active' : ''}`}
      >
        상품 목록
      </NavLink>
      <NavLink
        to="/admin/products/new"
        className={({ isActive }) => `pm-tab${isActive ? ' pm-tab--active' : ''}`}
      >
        상품 등록
      </NavLink>
    </div>
  )
}
