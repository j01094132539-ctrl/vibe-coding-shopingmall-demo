/** 체크아웃 결제 수단 — `CheckoutPage`·`requestPortOnePayment` 공통 */
/** @typedef {'card' | 'transfer'} CheckoutPaymentMethod */

/** 포트원(구 아임포트) 가맹점 식별코드 — `index.html` iamport.js + `IMP.init` */
export const PORTONE_IMP_CODE =
  import.meta.env.VITE_PORTONE_IMP_CODE || 'imp67148586'

/** 테스트 PG — 운영 시 `VITE_PORTONE_PG`로 교체 */
export const PORTONE_PG =

  import.meta.env.VITE_PORTONE_PG || 'html5_inicis.INIpayTest'

export class PortOnePaymentError extends Error {
  /**
   * @param {string} message
   * @param {PortOnePaymentErrorOptions} [options]
   */
  constructor(message, options = {}) {
    const { cancelled = false, response } = options
    super(message)
    this.name = 'PortOnePaymentError'
    /** @type {boolean} */
    this.cancelled = cancelled
    /** @type {PortOnePayResponse | undefined} */
    this.response = response
  }
}

/**
 * `https://cdn.iamport.kr/v1/iamport.js` 로드 후 결제 모듈 초기화
 * @returns {boolean} 초기화 성공 여부
 */
export function initPortOnePayment() {
  if (typeof window === 'undefined') return false

  const imp = window.IMP
  if (!imp || typeof imp.init !== 'function') {
    console.warn(
      '포트원 결제 SDK(IMP)를 찾을 수 없습니다. index.html에 iamport.js 스크립트가 있는지 확인해 주세요.'
    )
    return false
  }

  imp.init(PORTONE_IMP_CODE)
  return true
}

/** `IMP.request_pay`용 고유 merchant_uid */
export function createMerchantUid() {
  const rand = Math.random().toString(36).slice(2, 10)
  return `mall_${Date.now()}_${rand}`
}

/**
 * 체크아웃 `paymentMethod` → 포트원 pay_method
 * @param {'card' | 'transfer'} paymentMethod
 */
function toPortOnePayMethod(paymentMethod) {
  return paymentMethod === 'transfer' ? 'trans' : 'card'
}

/**
 * 포트원 결제창 호출 — 성공 시 imp_uid·merchant_uid 반환
 * @param {{
 *   paymentMethod: CheckoutPaymentMethod,
 *   merchantUid: string,
 *   name: string,
 *   amount: number,
 *   buyer_name: string,
 *   buyer_tel: string,
 *   buyer_email?: string,
 *   buyer_addr?: string,
 *   buyer_postcode?: string,
 * }} params
 */
export function requestPortOnePayment(params) {
  const {
    paymentMethod,
    merchantUid,
    name,
    amount,
    buyer_name,
    buyer_tel,
    buyer_email,
    buyer_addr,
    buyer_postcode,
  } = params

  const payAmount = Math.round(Number(amount))
  if (!Number.isFinite(payAmount) || payAmount < 1) {
    return Promise.reject(new PortOnePaymentError('결제 금액이 올바르지 않습니다.'))
  }

  return new Promise((resolve, reject) => {
    const imp = window.IMP
    if (!imp || typeof imp.request_pay !== 'function') {
      reject(
        new PortOnePaymentError(
          '결제 모듈을 사용할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
        )
      )
      return
    }

    imp.request_pay(
      {
        pg: PORTONE_PG,
        pay_method: toPortOnePayMethod(paymentMethod),
        merchant_uid: merchantUid,
        name: String(name).slice(0, 100) || '\uc8fc\ubb38',
        amount: payAmount,
        buyer_name,
        buyer_tel,
        ...(buyer_email ? { buyer_email } : {}),
        ...(buyer_addr ? { buyer_addr } : {}),
        ...(buyer_postcode ? { buyer_postcode } : {}),
      },
      (rsp) => {
        if (rsp?.success) {
          resolve({
            imp_uid: rsp.imp_uid,
            merchant_uid: rsp.merchant_uid || merchantUid,
            paid_amount: rsp.paid_amount,
            pay_method: rsp.pay_method,
          })
          return
        }

        const msg =
          (typeof rsp?.error_msg === 'string' && rsp.error_msg) ||
          '\uacb0\uc81c\uac00 \ucde8\uc18c\ub418\uc5c8\uc2b5\ub2c8\ub2e4.'
        reject(
          new PortOnePaymentError(msg, {
            cancelled: true,
            response: rsp,
          })
        )
      }
    )
  })
}
