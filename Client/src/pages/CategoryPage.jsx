import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from '@/lib/productsApi.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import HomeProductGrid from '@/pages/home/HomeProductGrid.jsx'
import { useHomeProducts } from '@/pages/home/useHomeProducts.js'
import './home.css'

/** 네비 카테고리 선택 → `GET /api/products?category=` 목록 */
export default function CategoryPage() {
  const { category: rawCategory } = useParams()
  const category = decodeURIComponent(typeof rawCategory === 'string' ? rawCategory : '').trim()

  const isValid = PRODUCT_CATEGORIES.includes(category)
  const { items, loading, error } = useHomeProducts(isValid ? category : null)

  const title = useMemo(() => `${category} 상품`, [category])
  const subtitle = useMemo(() => `${category} 카테고리 상품을 모아 보았습니다.`, [category])

  if (!isValid) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="home">
      <HomeNav />

      <div className="category-page__head">
        <Link to="/" className="category-page__back">
          ← 전체 상품
        </Link>
      </div>

      <HomeProductGrid
        items={items}
        loading={loading}
        error={error}
        title={title}
        subtitle={subtitle}
        sectionId="category-products"
        emptyText={`${category} 카테고리에 등록된 상품이 없습니다.`}
      />
    </div>
  )
}
