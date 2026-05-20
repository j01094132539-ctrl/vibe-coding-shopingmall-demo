import { memo } from 'react'
import HomeProductCard from '@/pages/home/HomeProductCard.jsx'

const HomeProductGrid = memo(function HomeProductGrid({
  items,
  loading,
  error,
  title = '추천 상품',
  subtitle = '이번 주 가장 많이 찾는 아이템',
  sectionId = 'new',
  emptyText = '등록된 상품이 없습니다.',
}) {
  const titleId = `${sectionId}-title`
  return (
    <section className="home-section" id={sectionId} aria-labelledby={titleId}>
      <div className="home-section__head">
        <h2 id={titleId} className="home-section__title">
          {title}
        </h2>
        <p className="home-section__sub">{subtitle}</p>
      </div>

      {loading ? (
        <p className="home-grid__status" role="status">
          상품 불러오는 중…
        </p>
      ) : error ? (
        <p className="home-grid__error" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="home-grid__status">{emptyText}</p>
      ) : (
        <ul className="home-grid">
          {items.map((item) => (
            <HomeProductCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
})

export default HomeProductGrid
