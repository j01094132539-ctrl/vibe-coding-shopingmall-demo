import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ProductAdminTabs from '@/pages/admin/ProductAdminTabs.jsx'
import ProductImageUpload from '@/components/ProductImageUpload.jsx'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { isPreviewableImageUrl } from '@/lib/cloudinary.js'
import {
  createProduct,
  fetchProductById,
  ProductApiError,
  updateProduct,
} from '@/lib/productsApi.js'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import {
  EMPTY_PRODUCT_FORM,
  PRODUCT_CATEGORIES,
} from '@/pages/admin/productRegisterConstants.js'
import {
  IconAlignLeft,
  IconBarcode,
  IconCheck,
  IconPencil,
  IconReset,
  IconShirt,
  IconTag,
  IconWon,
} from '@/pages/admin/ProductRegisterIcons.jsx'
import HomeNav from '@/pages/home/HomeNav.jsx'
import '../admin.css'
import '../home.css'
import './product-manage.css'
import './product-register.css'

function formatPreviewPrice(raw) {
  const n = Number(String(raw).replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return '—'
  return `${new Intl.NumberFormat('ko-KR').format(n)}원`
}

/** `POST /api/products` 본문 */
function buildPayload(form) {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    price: Number(form.price),
    category: form.category,
    image: form.image.trim(),
    description: form.description.trim(),
  }
}

/** API 단건 응답을 폼 상태로 변환 — TS `object` 좁히기 */
function productApiToForm(data) {
  const d = /** @type {Record<string, unknown>} */ (data)
  const cat =
    typeof d.category === 'string' && PRODUCT_CATEGORIES.includes(d.category)
      ? d.category
      : PRODUCT_CATEGORIES[0]
  return {
    sku: typeof d.sku === 'string' ? d.sku : '',
    name: typeof d.name === 'string' ? d.name : '',
    price:
      d.price != null && Number.isFinite(Number(d.price)) ? String(Number(d.price)) : '',
    category: cat,
    image: typeof d.image === 'string' ? d.image : '',
    description: typeof d.description === 'string' ? d.description : '',
  }
}

/** 어드민 상품 등록·수정 — `POST /api/products` / `PUT /api/products/:id` (`?edit=` 시 수정) */
export default function ProductRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editIdRaw = searchParams.get('edit')
  const editId =
    typeof editIdRaw === 'string' && /^[a-f\d]{24}$/i.test(editIdRaw.trim())
      ? editIdRaw.trim()
      : ''

  const { isAdmin, isInitializing } = useAuthProfile()

  const [form, setForm] = useState(EMPTY_PRODUCT_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // 목록에서 `?edit=` 로 들어올 때 `GET /api/products/:id`로 폼 채움
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId))
  const [editLoadError, setEditLoadError] = useState('')

  const isEditMode = Boolean(editId)

  useEffect(() => {
    if (isInitializing) return
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isInitializing, navigate])

  useEffect(() => {
    if (!editId || !isAdmin || isInitializing) {
      if (!editId) setLoadingEdit(false)
      return
    }

    let cancelled = false
    setLoadingEdit(true)
    setEditLoadError('')
    fetchProductById(editId)
      .then((data) => {
        if (cancelled || !data) return
        setForm(productApiToForm(data))
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err instanceof ProductApiError && typeof err.message === 'string'
            ? err.message
            : '상품 정보를 불러오지 못했습니다.'
        setEditLoadError(msg)
        setForm({ ...EMPTY_PRODUCT_FORM })
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false)
      })

    return () => {
      cancelled = true
    }
  }, [editId, isAdmin, isInitializing])

  const previewName = form.name.trim() || '상품명 미리보기'
  const previewSku = form.sku.trim() || 'SKU'
  const previewPrice = formatPreviewPrice(form.price)
  const previewImage = form.image.trim()
  const canPreviewImage = isPreviewableImageUrl(previewImage)

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  function handleReset() {
    if (isEditMode && editId && !editLoadError) {
      setLoadingEdit(true)
      setEditLoadError('')
      fetchProductById(editId)
        .then((data) => {
          if (!data) return
          setForm(productApiToForm(data))
        })
        .catch((err) => {
          const msg =
            err instanceof ProductApiError && typeof err.message === 'string'
              ? err.message
              : '상품 정보를 불러오지 못했습니다.'
          setEditLoadError(msg)
        })
        .finally(() => setLoadingEdit(false))
      setError('')
      return
    }
    setForm({ ...EMPTY_PRODUCT_FORM })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payload = buildPayload(form)
    if (!payload.sku || !payload.name || !payload.image) {
      setError('SKU, 상품명, 상품 이미지는 필수입니다.')
      return
    }
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setError('가격을 올바르게 입력해 주세요.')
      return
    }

    const token = readStoredAuthToken()
    if (!token) {
      setError('로그인이 필요합니다. 관리자 계정으로 다시 로그인해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      if (isEditMode) {
        await updateProduct(editId, payload, token)
      } else {
        await createProduct(payload, token)
      }
      navigate('/admin/products', { replace: true })
    } catch (err) {
      let msg =
        err instanceof ProductApiError && typeof err.message === 'string'
          ? err.message
          : err instanceof Error
            ? err.message
            : isEditMode
              ? '저장에 실패했습니다.'
              : '상품 등록에 실패했습니다.'
      // 서버 403 — JWT·DB 권한 불일치 시 재로그인 안내
      if (
        err instanceof ProductApiError &&
        err.status === 403 &&
        msg.includes('관리자 권한')
      ) {
        msg = `${msg} 관리자 계정으로 다시 로그인해 주세요.`
      }
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isInitializing && !isAdmin) return null

  return (
    <div className="admin-page">
      <HomeNav />

      <main className="admin-page__main">
        {isInitializing ? (
          <p className="admin-page__checking" role="status">
            권한 확인 중…
          </p>
        ) : (
          <div className="product-register product-register--with-tabs">
            <div className="product-register__tabs-outer">
              <ProductAdminTabs />
            </div>
            <div className="product-register__card">
              <header className="product-register__head">
                <div className="product-register__head-icon" aria-hidden>
                  <IconShirt />
                </div>
                <div>
                  <h1 className="product-register__title">
                    {isEditMode ? '상품 수정' : '상품 등록'}
                  </h1>
                  <p className="product-register__sub">
                    {isEditMode
                      ? '상품 정보를 수정한 뒤 저장하세요.'
                      : '새 상품 정보를 입력하세요'}
                  </p>
                </div>
              </header>

              {loadingEdit ? (
                <p className="product-register__checking" role="status">
                  상품 정보 불러오는 중…
                </p>
              ) : editLoadError ? (
                <p className="product-register__error" role="alert">
                  {editLoadError}
                </p>
              ) : (
              <form className="product-register__form" onSubmit={handleSubmit} noValidate>
                <div className="product-register__row product-register__row--2">
                  <div className="product-register__field">
                    <label className="product-register__label" htmlFor="product-sku">
                      <IconBarcode />
                      SKU (상품 코드)
                    </label>
                    <input
                      id="product-sku"
                      className="product-register__input"
                      name="sku"
                      value={form.sku}
                      onChange={(ev) => updateField('sku', ev.target.value)}
                      placeholder="TOP-001"
                      autoComplete="off"
                    />
                  </div>
                  <div className="product-register__field">
                    <label className="product-register__label" htmlFor="product-category">
                      <IconTag />
                      카테고리
                    </label>
                    <select
                      id="product-category"
                      className="product-register__select"
                      name="category"
                      value={form.category}
                      onChange={(ev) => updateField('category', ev.target.value)}
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="product-register__field">
                  <label className="product-register__label" htmlFor="product-name">
                    <IconPencil />
                    상품명
                  </label>
                  <input
                    id="product-name"
                    className="product-register__input"
                    name="name"
                    value={form.name}
                    onChange={(ev) => updateField('name', ev.target.value)}
                    placeholder="오버핏 코튼 셔츠"
                  />
                </div>

                <div className="product-register__field">
                  <label className="product-register__label" htmlFor="product-price">
                    <IconWon />
                    가격 (원)
                  </label>
                  <input
                    id="product-price"
                    className="product-register__input"
                    name="price"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(ev) => updateField('price', ev.target.value)}
                    placeholder="49000"
                  />
                </div>

                <ProductImageUpload
                  imageUrl={form.image}
                  onImageChange={(url) => updateField('image', url)}
                  disabled={submitting}
                />

                <div className="product-register__field">
                  <label className="product-register__label" htmlFor="product-description">
                    <IconAlignLeft />
                    상품 설명
                  </label>
                  <textarea
                    id="product-description"
                    className="product-register__textarea"
                    name="description"
                    value={form.description}
                    onChange={(ev) => updateField('description', ev.target.value)}
                    placeholder="선택 설명"
                  />
                </div>

                <section className="product-register__preview" aria-label="미리보기">
                  <h2 className="product-register__preview-title">미리보기</h2>
                  <article className="product-register__preview-card">
                    <div className="product-register__preview-thumb">
                      {canPreviewImage ? (
                        <img src={previewImage} alt="" />
                      ) : (
                        <IconShirt />
                      )}
                    </div>
                    <div className="product-register__preview-body">
                      <p className="product-register__preview-name">{previewName}</p>
                      <p className="product-register__preview-meta">
                        <span>SKU: {previewSku}</span>
                        <span className="product-register__preview-badge">
                          {form.category}
                        </span>
                      </p>
                    </div>
                    <p className="product-register__preview-price">{previewPrice}</p>
                  </article>
                </section>

                {error ? <p className="product-register__error">{error}</p> : null}

                <div className="product-register__actions">
                  <Link className="product-register__btn product-register__btn--ghost" to="/admin/products">
                    상품 목록
                  </Link>
                  <Link className="product-register__btn product-register__btn--ghost" to="/admin">
                    대시보드
                  </Link>
                  <button
                    type="button"
                    className="product-register__btn product-register__btn--ghost"
                    onClick={handleReset}
                    disabled={submitting || loadingEdit}
                  >
                    <IconReset />
                    초기화
                  </button>
                  <button
                    type="submit"
                    className="product-register__btn product-register__btn--primary"
                    disabled={submitting || loadingEdit || Boolean(editLoadError)}
                  >
                    <IconCheck />
                    {submitting
                      ? isEditMode
                        ? '저장 중…'
                        : '등록 중…'
                      : isEditMode
                        ? '변경 저장'
                        : '상품 등록'}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
