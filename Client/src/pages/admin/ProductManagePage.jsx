import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductAdminTabs from '@/pages/admin/ProductAdminTabs.jsx'
import {
  deleteProduct,
  fetchProductList,
  PRODUCT_CATEGORIES,
  PRODUCT_LIST_PAGE_SIZE,
  ProductApiError,
} from '@/lib/productsApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import {
  IconArrowLeft,
  IconFilter,
  IconPencilSm,
  IconPlusSm,
  IconSearch,
  IconTrashSm,
} from '@/pages/admin/ProductManageUiIcons.jsx'
import '../admin.css'
import '../home.css'
import './product-manage.css'

function formatWon(n) {
  const num = Number(n)
  if (!Number.isFinite(num) || num < 0) return '—'
  return `${new Intl.NumberFormat('ko-KR').format(num)}원`
}

function productRowKey(p, index) {
  if (p && typeof p === 'object') {
    if (p._id != null) return String(p._id)
    if (p.id != null) return String(p.id)
  }
  return `product-row-${index}`
}

function getProductId(p) {
  if (p && typeof p === 'object') {
    if (p._id != null) return String(p._id)
    if (p.id != null) return String(p.id)
  }
  return ''
}

/** `/admin` 대시보드와 동일한 상단 네비 + 참고 UI형 상품 목록/탭/검색·필터 */
export default function ProductManagePage() {
  const navigate = useNavigate()
  const { isAdmin, isInitializing } = useAuthProfile()

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({
    page: 1,
    limit: PRODUCT_LIST_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    if (isInitializing) return
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, isInitializing, navigate])

  // 상품명 검색 디바운스 — 페이지는 1로 리셋해 `GET /api/products?page=1&search=`와 맞춤
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(id)
  }, [searchQuery])

  useEffect(() => {
    if (!isAdmin || isInitializing) return

    let cancelled = false

    async function run() {
      setLoading(true)
      setError('')
      try {
        let currentPage = page
        let { data, meta: m } = await fetchProductList({
          page: currentPage,
          limit: PRODUCT_LIST_PAGE_SIZE,
          category: categoryFilter,
          search: debouncedSearch,
        })
        while (data.length === 0 && m.total > 0 && currentPage > 1) {
          currentPage -= 1
          ;({ data, meta: m } = await fetchProductList({
            page: currentPage,
            limit: PRODUCT_LIST_PAGE_SIZE,
            category: categoryFilter,
            search: debouncedSearch,
          }))
        }
        if (cancelled) return
        if (currentPage !== page) setPage(currentPage)
        setRows(data)
        setMeta(m)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof ProductApiError && typeof err.message === 'string'
            ? err.message
            : '상품 목록을 불러오지 못했습니다.'
        setError(msg)
        setRows([])
        setMeta({
          page: 1,
          limit: PRODUCT_LIST_PAGE_SIZE,
          total: 0,
          totalPages: 0,
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isAdmin, isInitializing, page, debouncedSearch, categoryFilter])

  async function handleDeleteClick(productId) {
    if (!productId) return
    if (!window.confirm('이 상품을 삭제할까요?')) return
    const token = readStoredAuthToken()
    if (!token) {
      setError('로그인이 필요합니다.')
      return
    }
    setError('')
    try {
      await deleteProduct(productId, token)
      let currentPage = page
      let { data, meta: m } = await fetchProductList({
        page: currentPage,
        limit: PRODUCT_LIST_PAGE_SIZE,
        category: categoryFilter,
        search: debouncedSearch,
      })
      while (data.length === 0 && m.total > 0 && currentPage > 1) {
        currentPage -= 1
        ;({ data, meta: m } = await fetchProductList({
          page: currentPage,
          limit: PRODUCT_LIST_PAGE_SIZE,
          category: categoryFilter,
          search: debouncedSearch,
        }))
      }
      if (currentPage !== page) setPage(currentPage)
      setRows(data)
      setMeta(m)
    } catch (err) {
      const msg =
        err instanceof ProductApiError && typeof err.message === 'string'
          ? err.message
          : '삭제에 실패했습니다.'
      setError(msg)
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
          <div className="pm-shell">
            <header className="pm-top">
              <div className="pm-top__left">
                <Link to="/admin" className="pm-back" aria-label="대시보드로">
                  <IconArrowLeft />
                </Link>
                <h1 className="pm-title">상품 관리</h1>
              </div>
              <Link to="/admin/products/new" className="pm-new-btn">
                <IconPlusSm />
                새상품 등록
              </Link>
            </header>

            <ProductAdminTabs />

            <div className="pm-toolbar">
              <label className="pm-search">
                <span className="pm-search__icon" aria-hidden>
                  <IconSearch />
                </span>
                <input
                  type="search"
                  className="pm-search__input"
                  placeholder="상품명으로 검색…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="pm-filter-wrap">
                <button
                  type="button"
                  className={`pm-filter-btn${filterOpen ? ' pm-filter-btn--open' : ''}`}
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen((o) => !o)}
                >
                  <IconFilter />
                  필터
                </button>
                {filterOpen ? (
                  <div className="pm-filter-pop">
                    <label className="pm-filter-pop__label" htmlFor="pm-category-filter">
                      카테고리
                    </label>
                    <select
                      id="pm-category-filter"
                      className="pm-filter-pop__select"
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value)
                        setPage(1)
                      }}
                    >
                      <option value="">전체</option>
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            {error ? (
              <p className="pm-banner-error" role="alert">
                {error}
              </p>
            ) : null}

            <section className="pm-panel" aria-label="상품 목록">
              {loading ? (
                <p className="pm-status" role="status">
                  목록 불러오는 중…
                </p>
              ) : rows.length === 0 ? (
                <div className="pm-empty">
                  <p>
                    {meta.total === 0
                      ? '등록된 상품이 없습니다.'
                      : '검색·필터 조건에 맞는 상품이 없습니다.'}
                  </p>
                  {meta.total === 0 ? (
                    <Link to="/admin/products/new" className="pm-new-btn pm-new-btn--inline">
                      <IconPlusSm />
                      새상품 등록
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="pm-table-scroll">
                  <table className="pm-table">
                    <thead>
                      <tr>
                        <th scope="col">이미지</th>
                        <th scope="col">상품명</th>
                        <th scope="col">카테고리</th>
                        <th scope="col">가격</th>
                        <th scope="col">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p, index) => {
                        const id = getProductId(p)
                        const image =
                          typeof p.image === 'string' && p.image.trim() !== ''
                            ? p.image.trim()
                            : ''
                        const name = typeof p.name === 'string' ? p.name : ''
                        const category =
                          typeof p.category === 'string' ? p.category : '—'
                        return (
                          <tr key={productRowKey(p, index)}>
                            <td>
                              <div className="pm-thumb">
                                {image ? (
                                  <img src={image} alt="" loading="lazy" />
                                ) : (
                                  <span className="pm-thumb__ph" aria-hidden>
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="pm-cell-name">{name || '—'}</td>
                            <td>
                              <span className="pm-cat">{category}</span>
                            </td>
                            <td className="pm-cell-price">{formatWon(p.price)}</td>
                            <td>
                              <div className="pm-actions">
                                <Link
                                  to={`/admin/products/new?edit=${encodeURIComponent(id)}`}
                                  className="pm-icon-btn pm-icon-btn--edit"
                                  title="수정"
                                  aria-label={`${name || '상품'} 수정`}
                                >
                                  <IconPencilSm />
                                </Link>
                                <button
                                  type="button"
                                  className="pm-icon-btn pm-icon-btn--del"
                                  title="삭제"
                                  aria-label={`${name || '상품'} 삭제`}
                                  onClick={() => handleDeleteClick(id)}
                                >
                                  <IconTrashSm />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && rows.length > 0 && meta.totalPages > 1 ? (
                <nav className="pm-pagination" aria-label="페이지 이동">
                  <button
                    type="button"
                    className="pm-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    이전
                  </button>
                  <span className="pm-pagination__info">
                    {meta.page} / {meta.totalPages} 페이지 · 총 {meta.total}건 (페이지당 {meta.limit}개)
                  </span>
                  <button
                    type="button"
                    className="pm-page-btn"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  >
                    다음
                  </button>
                </nav>
              ) : !loading && rows.length > 0 && meta.totalPages <= 1 ? (
                <p className="pm-pagination__single">
                  총 {meta.total}건 (페이지당 {meta.limit}개)
                </p>
              ) : null}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
