import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProductById, ProductApiError } from '@/lib/productsApi.js'
import { addCartItem, CartApiError } from '@/lib/cartsApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { formatPrice } from '@/pages/home/constants.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './product-detail.css'

const DEMO_COLORS = ['기본', '블랙', '화이트', '네이비']
const DEMO_SIZES = ['XS', 'S', 'M', 'L', 'XL']
const MAX_QUANTITY = 99
const DEMO_TABS = [
  { id: 'info', label: '정보' },
  { id: 'size', label: '사이즈' },
  { id: 'recommend', label: '추천' },
  { id: 'review', label: '스냅·후기', count: 128 },
  { id: 'qna', label: '문의', count: 12 },
]

function IconHeart({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden>
      <path
        d="M12 21s-7-4.35-10-8.5C-1 8.5 2.5 4 7 4c2.5 0 5 2 5 2s2.5-2 5-2c4.5 0 8 4.5 5 8.5C19 16.65 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mongo `_id` / `id` 문자열 추출 — lean 응답 호환 */
function extractDocId(d, fallback = '') {
  if (!d || typeof d !== 'object') return fallback
  if (d.id != null && String(d.id).trim()) return String(d.id).trim()
  if (d._id != null) return String(d._id)
  return fallback
}

/** `GET /api/products/:id` → 화면용 상품 객체 */
function normalizeProduct(raw, routeId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)
  const id = extractDocId(d, routeId)
  const name = typeof d.name === 'string' ? d.name : '상품'
  const category = typeof d.category === 'string' ? d.category : '상의'
  const sku = typeof d.sku === 'string' ? d.sku : ''
  const price = Number(d.price)
  const salePrice = Number.isFinite(price) && price >= 0 ? price : 0
  const image = typeof d.image === 'string' ? d.image.trim() : ''
  const description =
    typeof d.description === 'string' && d.description.trim() !== ''
      ? d.description.trim()
      : `${name}은(는) 데일리에 활용하기 좋은 ${category} 아이템입니다. 편안한 착용감과 깔끔한 실루엣이 특징입니다.`

  // 할인가 연출(데모) — 실제 할인 필드 없음
  const discountRate = 32
  const originalPrice = salePrice > 0 ? Math.round(salePrice / (1 - discountRate / 100)) : 0

  return {
    id,
    sku,
    name,
    category,
    salePrice,
    originalPrice,
    discountRate,
    image,
    description,
    brand: 'VIBE MALL',
  }
}

/** 홈 카드 클릭 → `GET /api/products/:id` 무신사형 상세 */
const POST_LOGIN_CHECKOUT_KEY = 'postLoginCheckout'

export default function ProductDetailPage() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const productId = typeof routeId === 'string' ? routeId.trim() : ''

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [thumbIndex, setThumbIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState(DEMO_COLORS[0])
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [brandLiked, setBrandLiked] = useState(false)
  const [productLiked, setProductLiked] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [cartNotice, setCartNotice] = useState('')
  const [buyBusy, setBuyBusy] = useState(false)

  useEffect(() => {
    if (!productId) {
      setError('상품 주소가 올바르지 않습니다.')
      setLoading(false)
      setProduct(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setProduct(null)

    fetchProductById(productId)
      .then((data) => {
        if (cancelled) return
        const p = normalizeProduct(data, productId)
        if (!p) {
          setError('상품 정보를 표시할 수 없습니다.')
          return
        }
        setProduct(p)
        setThumbIndex(0)
        setSelectedColor(DEMO_COLORS[0])
        setSelectedSize('')
        setQuantity(1)
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err instanceof ProductApiError && err.status === 404
            ? '상품을 찾을 수 없습니다.'
            : err instanceof ProductApiError && typeof err.message === 'string'
              ? err.message
              : '상품을 불러오지 못했습니다. 서버가 실행 중인지 확인해 주세요.'
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  const galleryImages = useMemo(() => {
    if (!product?.image) return []
    return [product.image, product.image, product.image, product.image]
  }, [product])

  const mainImage = galleryImages[thumbIndex] || product?.image || ''

  const unitPrice = product?.salePrice ?? 0
  const totalPurchasePrice = useMemo(
    () => unitPrice * quantity,
    [unitPrice, quantity]
  )

  function clampQuantity(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return 1
    return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(n)))
  }

  function changeQuantity(delta) {
    setQuantity((prev) => clampQuantity(prev + delta))
  }

  function handleQuantityInput(e) {
    setQuantity(clampQuantity(e.target.value))
  }

  // `POST /api/carts/me/items` — 로그인·사이즈·수량 반영
  async function handleAddToCart() {
    if (!selectedSize || !product?.id || quantity < 1) return
    const token = readStoredAuthToken()
    if (!token) {
      setCartNotice('로그인 후 장바구니에 담을 수 있습니다.')
      window.setTimeout(() => setCartNotice(''), 3500)
      return
    }
    try {
      await addCartItem({ product: product.id, quantity }, token)
      setCartNotice(
        `장바구니에 담았습니다. (${selectedColor} / ${selectedSize} · ${quantity}개 · ${formatPrice(totalPurchasePrice)}원)`
      )
    } catch (err) {
      const msg =
        err instanceof CartApiError && typeof err.message === 'string'
          ? err.message
          : '장바구니에 담지 못했습니다.'
      setCartNotice(msg)
    }
    window.setTimeout(() => setCartNotice(''), 3500)
  }

  // 구매하기 — 장바구니 API에 담은 뒤 `CheckoutPage` (`/checkout`)로 이동 (비로그인은 로그인 후 동일 처리)
  async function handleBuyNow() {
    if (!selectedSize || !product?.id || quantity < 1) return
    const token = readStoredAuthToken()
    if (!token) {
      try {
        sessionStorage.setItem(
          POST_LOGIN_CHECKOUT_KEY,
          JSON.stringify({ product: product.id, quantity })
        )
      } catch {
        // ignore
      }
      navigate('/login')
      return
    }
    setBuyBusy(true)
    setCartNotice('')
    try {
      await addCartItem({ product: product.id, quantity }, token)
      navigate('/checkout')
    } catch (err) {
      const msg =
        err instanceof CartApiError && typeof err.message === 'string'
          ? err.message
          : '결제 페이지로 이동할 수 없습니다. 잠시 후 다시 시도해 주세요.'
      setCartNotice(msg)
      window.setTimeout(() => setCartNotice(''), 4000)
    } finally {
      setBuyBusy(false)
    }
  }

  return (
    <div className="product-detail">
      <HomeNav />

      <div className="product-detail__body">
        <Link to="/" className="product-detail__back">
          ← 쇼핑 계속하기
        </Link>

        {loading ? (
          <p className="product-detail__status" role="status">
            상품 정보 불러오는 중…
          </p>
        ) : error ? (
          <p className="product-detail__error" role="alert">
            {error} <Link to="/">홈으로 돌아가기</Link>
          </p>
        ) : !product ? (
          <p className="product-detail__empty">표시할 상품이 없습니다.</p>
        ) : (
          <>
            <div className="product-detail__layout">
              <div className="product-detail__gallery">
                <div className="product-detail__thumb-col" role="list">
                  {galleryImages.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`product-detail__thumb${i === thumbIndex ? ' product-detail__thumb--active' : ''}`}
                      onClick={() => setThumbIndex(i)}
                      aria-label={`이미지 ${i + 1}`}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
                <div className="product-detail__main-img-wrap">
                  {mainImage ? (
                    <img
                      className="product-detail__main-img"
                      src={mainImage}
                      alt={product.name}
                    />
                  ) : (
                    <div className="product-detail__main-img product-detail__main-img--empty" />
                  )}
                  {galleryImages.length > 0 ? (
                    <span className="product-detail__img-counter">
                      {thumbIndex + 1} / {galleryImages.length}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="product-detail__buy">
                <div className="product-detail__brand-row">
                  <span className="product-detail__brand">{product.brand}</span>
                  <button
                    type="button"
                    className="product-detail__brand-like"
                    aria-pressed={brandLiked}
                    onClick={() => setBrandLiked((v) => !v)}
                  >
                    <IconHeart filled={brandLiked} />
                    2.6만
                  </button>
                </div>

                <p className="product-detail__crumb">
                  {product.category} &gt; {product.name}
                </p>
                <h1 className="product-detail__title">{product.name}</h1>

                <div className="product-detail__rating">
                  <span className="product-detail__stars">★ 4.8</span>
                  <span className="product-detail__review-link">리뷰 128개</span>
                  <span className="product-detail__ai">AI 요약</span>
                </div>

                <div className="product-detail__price-block">
                  {product.originalPrice > product.salePrice ? (
                    <p className="product-detail__price-original">
                      {formatPrice(product.originalPrice)}원
                    </p>
                  ) : null}
                  <div className="product-detail__price-row">
                    {product.discountRate > 0 ? (
                      <span className="product-detail__discount">{product.discountRate}%</span>
                    ) : null}
                    <p className="product-detail__price-sale">
                      {formatPrice(product.salePrice)}원
                    </p>
                  </div>
                </div>

                <button type="button" className="product-detail__coupon">
                  첫 구매 20% 쿠폰 받기 (데모)
                </button>

                <div className="product-detail__field">
                  <label htmlFor="pd-color">색상</label>
                  <select
                    id="pd-color"
                    className="product-detail__select"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                  >
                    {DEMO_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="product-detail__field">
                  <label htmlFor="pd-size">사이즈</label>
                  <select
                    id="pd-size"
                    className="product-detail__select"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    <option value="">사이즈를 선택해 주세요</option>
                    {DEMO_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="product-detail__field product-detail__field--qty">
                  <label htmlFor="pd-qty">수량</label>
                  <div className="product-detail__qty">
                    <button
                      type="button"
                      className="product-detail__qty-btn"
                      aria-label="수량 줄이기"
                      disabled={quantity <= 1}
                      onClick={() => changeQuantity(-1)}
                    >
                      −
                    </button>
                    <input
                      id="pd-qty"
                      className="product-detail__qty-input"
                      type="number"
                      min={1}
                      max={MAX_QUANTITY}
                      value={quantity}
                      onChange={handleQuantityInput}
                      aria-label="구매 수량"
                    />
                    <button
                      type="button"
                      className="product-detail__qty-btn"
                      aria-label="수량 늘리기"
                      disabled={quantity >= MAX_QUANTITY}
                      onClick={() => changeQuantity(1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="product-detail__total" aria-live="polite">
                    <div className="product-detail__total-row">
                      <span>단가</span>
                      <span>{formatPrice(unitPrice)}원</span>
                    </div>
                    <div className="product-detail__total-row">
                      <span>수량</span>
                      <span>{quantity}개</span>
                    </div>
                    <div className="product-detail__total-row product-detail__total-row--sum">
                      <span>총 구매 금액</span>
                      <strong>{formatPrice(totalPurchasePrice)}원</strong>
                    </div>
                  </div>

                {cartNotice ? (
                  <p className="product-detail__notice" role="status">
                    {cartNotice}
                  </p>
                ) : null}

                <div className="product-detail__actions">
                  <button
                    type="button"
                    className="product-detail__btn-like"
                    aria-pressed={productLiked}
                    onClick={() => setProductLiked((v) => !v)}
                    title="좋아요"
                  >
                    <IconHeart filled={productLiked} />
                  </button>
                  <button
                    type="button"
                    className="product-detail__btn-cart"
                    disabled={!selectedSize}
                    onClick={handleAddToCart}
                  >
                    장바구니
                  </button>
                  <button
                    type="button"
                    className="product-detail__btn-buy"
                    disabled={!selectedSize || buyBusy}
                    onClick={handleBuyNow}
                  >
                    {buyBusy ? '이동 중…' : '구매하기'}
                  </button>
                </div>

                <ul className="product-detail__benefits">
                  <li>무신사페이 · 카카오페이 · 토스페이 할인 (데모)</li>
                  <li>회원 무료배송 · 2~4일 내 출고</li>
                </ul>
              </div>
            </div>

            <nav className="product-detail__tabs" aria-label="상품 상세 탭">
              {DEMO_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`product-detail__tab${activeTab === tab.id ? ' product-detail__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.count != null ? ` ${tab.count}` : ''}
                </button>
              ))}
            </nav>

            <div className="product-detail__tab-panel">
              {activeTab === 'info' ? (
                <>
                  <h3>상품 정보</h3>
                  <p>{product.description}</p>
                  <ul className="product-detail__meta-list">
                    <li>
                      <strong>스타일</strong> {product.sku || '—'}
                    </li>
                    <li>
                      <strong>카테고리</strong> {product.category}
                    </li>
                    <li>
                      <strong>컬러</strong> {selectedColor}
                    </li>
                  </ul>
                </>
              ) : null}
              {activeTab === 'size' ? (
                <>
                  <h3>사이즈 가이드</h3>
                  <table className="product-detail__size-table">
                    <thead>
                      <tr>
                        <th>사이즈</th>
                        <th>총장</th>
                        <th>가슴</th>
                        <th>어깨</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_SIZES.map((s, i) => (
                        <tr key={s}>
                          <td>{s}</td>
                          <td>{62 + i * 2}</td>
                          <td>{48 + i * 2}</td>
                          <td>{42 + i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
              {activeTab === 'recommend' ? (
                <p>비슷한 {product.category} 상품 추천 영역입니다. (데모)</p>
              ) : null}
              {activeTab === 'review' ? (
                <p>
                  스냅·후기 128건 — 실제 리뷰 API 연동 전 데모 문구입니다. 평점 ★ 4.8
                </p>
              ) : null}
              {activeTab === 'qna' ? (
                <p>상품 문의 12건 — 문의 작성 기능은 추후 연동할 수 있습니다.</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
