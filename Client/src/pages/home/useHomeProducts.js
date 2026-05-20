import { useEffect, useState } from 'react'
import {
  fetchAllProducts,
  fetchAllProductsByCategory,
  ProductApiError,
} from '@/lib/productsApi.js'

const TONE_BY_CATEGORY = {
  상의: 'sand',
  하의: 'denim',
  악세사리: 'leather',
}

const TONE_FALLBACK = ['sand', 'denim', 'leather', 'coat']

/** API 상품 한 건 → 홈 카드용 아이템 (`HomeProductCard`) */
export function mapProductToHomeItem(p, index) {
  const d = /** @type {Record<string, unknown>} */ (p)
  const id = String(d._id ?? d.id ?? `idx-${index}`)
  const name = typeof d.name === 'string' ? d.name : '상품'
  const price = Number(d.price)
  const category = typeof d.category === 'string' ? d.category : ''
  const tone =
    (category && TONE_BY_CATEGORY[category]) || TONE_FALLBACK[index % TONE_FALLBACK.length]
  const image = typeof d.image === 'string' ? d.image.trim() : ''
  return {
    id,
    name,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    tag: category || null,
    tone,
    image,
  }
}

/**
 * 홈·카테고리 `GET /api/products` 조회
 * @param {string | null | undefined} category — `상의` 등, 없으면 전체
 */
export function useHomeProducts(category = null) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const cat = typeof category === 'string' && category.trim() !== '' ? category.trim() : null
    const loader = cat ? () => fetchAllProductsByCategory(cat) : () => fetchAllProducts()

    loader()
      .then((rows) => {
        if (cancelled) return
        setItems(rows.map(mapProductToHomeItem))
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err instanceof ProductApiError && typeof err.message === 'string'
            ? err.message
            : '상품을 불러오지 못했습니다.'
        setError(msg)
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [category])

  return { items, loading, error }
}
