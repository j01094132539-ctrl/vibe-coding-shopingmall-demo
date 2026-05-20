/** `index.html` — `https://cdn.iamport.kr/v1/iamport.js` 전역 `IMP` */
interface PortOnePayResponse {
  success?: boolean
  imp_uid?: string
  merchant_uid?: string
  paid_amount?: number
  pay_method?: string
  error_msg?: string
  error_code?: string
}

/** `PortOnePaymentError` 생성자 두 번째 인자 */
interface PortOnePaymentErrorOptions {
  cancelled?: boolean
  response?: PortOnePayResponse
}

interface Window {
  IMP?: {
    init: (impCode: string) => void
    request_pay?: (
      params: Record<string, unknown>,
      callback: (response: PortOnePayResponse) => void
    ) => void
  }
}
