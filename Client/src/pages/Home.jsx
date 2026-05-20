import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import HomeFlash from '@/pages/home/HomeFlash.jsx'
import HomeFooter from '@/pages/home/HomeFooter.jsx'
import HomeHero from '@/pages/home/HomeHero.jsx'
import HomeNav from '@/pages/home/HomeNav.jsx'
import HomeProductGrid from '@/pages/home/HomeProductGrid.jsx'
import { useHomePageData } from '@/pages/home/useHomePageData.js'
import { useHomeProducts } from '@/pages/home/useHomeProducts.js'
import './home.css'

export default function Home() {
  const { notice, loginNotice, backendText, backendError } = useHomePageData()
  // 추천 상품 — 공개 `GET /api/products`로 전체 수집 후 그리드에 전달
  const { items: homeProducts, loading: productsLoading, error: productsError } =
    useHomeProducts()
  const { isLoggedIn } = useAuthProfile()

  return (
    <div className="home">
      <HomeNav />

      {/* 로그인 완료 후에는 네비 인사만 표시 — `loginFlash` 문구 숨김 */}
      <HomeFlash notice={notice} loginNotice={isLoggedIn ? null : loginNotice} />

      {/* 회원가입은 `AppNavbar` 상단 우측 — 히어로는 쇼핑 CTA만 */}
      <HomeHero />

      <HomeProductGrid
        items={homeProducts}
        loading={productsLoading}
        error={productsError}
      />

      <HomeFooter backendText={backendText} backendError={backendError} />
    </div>
  )
}
