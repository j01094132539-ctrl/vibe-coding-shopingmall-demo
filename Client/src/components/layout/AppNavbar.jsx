import { memo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import { useCartCount } from '@/hooks/useCartCount.js'
import { PRODUCT_CATEGORIES } from '@/lib/productsApi.js'
import { useDismissibleMenu } from '@/pages/home/useDismissibleMenu.js'
import './navbar.css'

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-7-4.35-10-8.5C-1 8.5 2.5 4 7 4c2.5 0 5 2 5 2s2.5-2 5-2c4.5 0 8 4.5 5 8.5C19 16.65 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 19a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L6 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" />
    </svg>
  )
}

/** 공통 상단 네비 — `AuthProfileProvider` 기준으로 로그인/로그아웃 UI 전환 */
const AppNavbar = memo(function AppNavbar() {
  const navigate = useNavigate()
  const { greetingName, isAdmin, isLoggedIn, logout } = useAuthProfile()
  const userMenu = useDismissibleMenu()
  const categoryMenu = useDismissibleMenu()
  const cartCount = useCartCount(isLoggedIn)
  const badgeText = cartCount > 99 ? '99+' : String(cartCount)

  const handleLogout = useCallback(() => {
    logout()
    userMenu.close()
  }, [logout, userMenu])

  // 마이 메뉴 — `MyOrdersPage` (`/orders`, `GET /api/orders/me`)
  const goMyOrders = useCallback(() => {
    userMenu.close()
    navigate('/orders')
  }, [navigate, userMenu])

  const toggleUserMenu = useCallback(() => {
    categoryMenu.close()
    userMenu.toggle()
  }, [categoryMenu, userMenu])

  const toggleCategoryMenu = useCallback(() => {
    userMenu.close()
    categoryMenu.toggle()
  }, [userMenu, categoryMenu])

  const goCategory = useCallback(
    (category) => {
      categoryMenu.close()
      navigate(`/category/${encodeURIComponent(category)}`)
    },
    [categoryMenu, navigate]
  )

  const goAllProducts = useCallback(() => {
    categoryMenu.close()
    navigate('/')
  }, [categoryMenu, navigate])

  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        <Link className="app-navbar__brand" to="/">
          VIBE MALL
        </Link>

        <form
          className="app-navbar__search"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <span className="app-navbar__search-icon">
            <IconSearch />
          </span>
          <input
            className="app-navbar__search-input"
            type="search"
            placeholder="VIBE MALL은 모든 상품 무료배송!"
            aria-label="상품 검색"
          />
        </form>

        <div className="app-navbar__actions">
          {/* 카테고리 드롭다운 — `/category/:category` */}
          <div className="app-navbar__category" ref={categoryMenu.ref}>
            <button
              type="button"
              className="app-navbar__action"
              aria-expanded={categoryMenu.open}
              aria-haspopup="true"
              onClick={toggleCategoryMenu}
            >
              <span className="app-navbar__action-icon">
                <IconMenu />
              </span>
              <span className="app-navbar__action-label">카테고리</span>
            </button>
            {categoryMenu.open ? (
              <div className="app-navbar__dropdown app-navbar__dropdown--category" role="menu">
                <button
                  type="button"
                  className="app-navbar__dropdown-item"
                  role="menuitem"
                  onClick={goAllProducts}
                >
                  전체 상품
                </button>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="app-navbar__dropdown-item"
                    role="menuitem"
                    onClick={() => goCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Link to="/#new" className="app-navbar__action" aria-label="찜">
            <span className="app-navbar__action-icon">
              <IconHeart />
            </span>
            <span className="app-navbar__action-label">찜</span>
          </Link>

          {/* 장바구니 — 로그인·마이보다 왼쪽(우측 액션에서 인증 직전) */}
          <Link to="/cart" className="app-navbar__action app-navbar__cart-wrap" aria-label="장바구니">
            <span className="app-navbar__action-icon">
              <IconCart />
            </span>
            <span className="app-navbar__action-label">장바구니</span>
            <span className="app-navbar__cart-badge" aria-label={`장바구니 ${cartCount}개`}>
              {badgeText}
            </span>
          </Link>

          {isLoggedIn && greetingName ? (
            <div className="app-navbar__user" ref={userMenu.ref}>
              <button
                type="button"
                className="app-navbar__welcome-btn"
                aria-expanded={userMenu.open}
                aria-haspopup="true"
                onClick={toggleUserMenu}
              >
                <IconUser />
                <span className="app-navbar__action-label">마이</span>
                <span className="app-navbar__welcome-name">{greetingName}</span>
              </button>
              {userMenu.open ? (
                <div className="app-navbar__dropdown" role="menu">
                  <button
                    type="button"
                    className="app-navbar__dropdown-item"
                    role="menuitem"
                    onClick={goMyOrders}
                  >
                    내 주문 목록
                  </button>
                  <button
                    type="button"
                    className="app-navbar__dropdown-item"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="app-navbar__guest">
              <Link to="/login" className="app-navbar__login">
                로그인
              </Link>
              {/* 비로그인 — `SignupPage` (`/signup`), 홈 히어로 CTA 대신 상단 우측 노출 */}
              <Link to="/signup" className="app-navbar__signup">
                회원가입
              </Link>
            </div>
          )}

          {isLoggedIn && isAdmin ? (
            <Link className="app-navbar__admin" to="/admin">
              어드민
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
})

export default AppNavbar
