import { memo } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@/pages/home/constants.js'

const HomeProductCard = memo(function HomeProductCard({ item }) {
  const hasImage = typeof item.image === 'string' && item.image.trim() !== ''

  return (
    <li className="home-card">
      <Link to={`/products/${item.id}`} className="home-card__link">
        <article>
          <div
            className={`home-card__media home-card__media--${item.tone}${hasImage ? ' home-card__media--with-img' : ''}`}
          >
            {hasImage ? (
              <img
                className="home-card__img"
                src={item.image.trim()}
                alt={item.name}
                loading="lazy"
              />
            ) : null}
            {item.tag ? <span className="home-card__tag">{item.tag}</span> : null}
          </div>
          <h3 className="home-card__name">{item.name}</h3>
          <p className="home-card__price">{formatPrice(item.price)}원</p>
        </article>
      </Link>
    </li>
  )
})

export default HomeProductCard
