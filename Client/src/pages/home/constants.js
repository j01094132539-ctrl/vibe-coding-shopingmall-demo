// 홈 상품 가격 표기 — `formatPrice`는 `HomeProductCard`에서 사용
const priceFormatter = new Intl.NumberFormat('ko-KR')

export function formatPrice(won) {
  return priceFormatter.format(won)
}
