import { Link, useLocation } from 'react-router-dom'
import { ADMIN_QUICK_ACTIONS } from '@/pages/admin/adminDashboardData.js'
import { QuickActionIcon } from '@/pages/admin/AdminDashboardIcons.jsx'

/** 대시보드·상품 관리 등에서 공통으로 쓰는 「빠른 작업」 패널 — 현재 경로와 `to`가 같으면 강조 */
export default function AdminQuickActions() {
  const { pathname } = useLocation()

  return (
    <aside className="admin-quick" aria-labelledby="admin-quick-title">
      <h2 id="admin-quick-title" className="admin-panel__title">
        빠른 작업
      </h2>
      <ul className="admin-quick__list">
        {ADMIN_QUICK_ACTIONS.map((action) => {
          const isActive = Boolean(action.to && pathname === action.to)
          const baseClass = action.primary
            ? 'admin-quick__btn admin-quick__btn--primary'
            : 'admin-quick__btn'
          const className = isActive ? `${baseClass} admin-quick__btn--active` : baseClass

          return (
            <li key={action.id}>
              {action.to ? (
                <Link to={action.to} className={className}>
                  <span className="admin-quick__icon" aria-hidden>
                    <QuickActionIcon id={action.id} />
                  </span>
                  {action.label}
                </Link>
              ) : (
                <button type="button" className={className}>
                  <span className="admin-quick__icon" aria-hidden>
                    <QuickActionIcon id={action.id} />
                  </span>
                  {action.label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
