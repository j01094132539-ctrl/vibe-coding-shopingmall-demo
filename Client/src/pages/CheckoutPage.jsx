import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthProfile } from '@/hooks/useAuthProfile.js'
import { CartApiError, fetchMyCart } from '@/lib/cartsApi.js'
import { createMyOrder, OrderApiError } from '@/lib/ordersApi.js'
import { readStoredAuthToken } from '@/lib/authSession.js'
import { fetchCurrentUser } from '@/lib/usersApi.js'
import { formatPrice } from '@/pages/home/constants.js'
import {
  createMerchantUid,
  initPortOnePayment,
  PortOnePaymentError,
  requestPortOnePayment,
} from '@/lib/portone.js'
import HomeNav from '@/pages/home/HomeNav.jsx'
import './home.css'
import './checkout.css'

const WON = '\u20A9'

function formatWon(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `${WON}0`
  return `${WON}${formatPrice(n)}`
}

function getLineProduct(line) {
  const p = line?.product
  if (p && typeof p === 'object') {
    return {
      id: p.id || p._id,
      name: p.name || '\uc0c1\ud488',
      sku: typeof p.sku === 'string' ? p.sku : '',
      category: typeof p.category === 'string' ? p.category : '',
      image: p.image || '',
      price: p.price,
    }
  }
  return {
    id: typeof p === 'string' ? p : '',
    name: '\uc0c1\ud488',
    sku: '',
    category: '',
    image: '',
    price: null,
  }
}

function IconBack() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTruck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 3h13v11H1V3zm13 2h4l3 3v6h-7V5zM6 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h3l1.5 4-2 1.2a11 11 0 005.3 5.3L15 12.5l4 1.5v3a2 2 0 01-2 2C9.6 19 5 14.4 5 8.5a2 2 0 012-4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 11V8a4 4 0 118 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * @typedef {import('@/lib/portone.js').CheckoutPaymentMethod} CheckoutPaymentMethod
 */

/** ?? ?? ? `POST /api/orders/me` payment.method (`card` | `transfer`) */
/** @type {ReadonlyArray<{ id: CheckoutPaymentMethod, label: string }>} */
const PAYMENT_OPTIONS = [
  { id: 'card', label: '\uc2e0\uc6a9\uce74\ub4dc' },
  { id: 'transfer', label: '\uacc4\uc88c\uc774\uccb4' },
]

const STEPS = [
  { id: 1, key: 'shipping', label: '\ubc30\uc1a1' },
  { id: 2, key: 'payment', label: '\uacb0\uc81c' },
  { id: 3, key: 'review', label: '\ud655\uc778' },
]

/** ??? `name` ? ? ??? + N? */
function buildPaymentOrderName(cartItems) {
  const lines = Array.isArray(cartItems) ? cartItems : []
  if (lines.length === 0) return '\uc1fc\ud551\ubab0 \uc8fc\ubb38'
  const first = getLineProduct(lines[0])
  if (lines.length === 1) return first.name
  return `${first.name} \uc678 ${lines.length - 1}\uac74`
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { isLoggedIn, profile } = useAuthProfile()

  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ??? ?? ? API `shipping.recipientName` ?? ??
  const [recipientName, setRecipientName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [deliveryMemo, setDeliveryMemo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(
    /** @type {CheckoutPaymentMethod} */ ('card')
  )

  const loadCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(null)
      setLoading(false)
      return
    }
    const token = readStoredAuthToken()
    if (!token) {
      setCart(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [cartData, userJson] = await Promise.all([
        fetchMyCart(token),
        fetchCurrentUser(token).catch(() => null),
      ])
      setCart(cartData)

      const userData =
        userJson && typeof userJson === 'object' && userJson.data && typeof userJson.data === 'object'
          ? userJson.data
          : null

      const fullName =
        (typeof userData?.name === 'string' && userData.name.trim()) ||
        profile?.name ||
        ''
      if (fullName) {
        setRecipientName(fullName)
      }

      if (typeof userData?.email === 'string') {
        setEmail(userData.email.trim())
      }
      if (typeof userData?.address === 'string' && userData.address.trim()) {
        setAddressLine1(userData.address.trim())
      }
    } catch (err) {
      const msg =
        err instanceof CartApiError && typeof err.message === 'string'
          ? err.message
          : '\uc7a5\ubc14\uad6c\ub2c8\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.'
      setError(msg)
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, profile?.name])

  // ??? ?? SDK ? `IMP.init('imp67148586')` (`index.html` iamport.js)
  useEffect(() => {
    initPortOnePayment()
  }, [])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  useEffect(() => {
    if (!loading && isLoggedIn && cart && (!Array.isArray(cart.items) || cart.items.length === 0)) {
      navigate('/cart', { replace: true })
    }
  }, [loading, isLoggedIn, cart, navigate])

  async function handlePlaceOrder(e) {
    e.preventDefault()
    const token = readStoredAuthToken()
    if (!token) return

    const name = recipientName.trim()
    if (!name) {
      setError('\uc774\ub984\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.')
      return
    }
    if (!phone.trim()) {
      setError('\uc804\ud654\ubc88\ud638\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.')
      return
    }
    if (!postalCode.trim()) {
      setError('\uc6b0\ud3b8\ubc88\ud638\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.')
      return
    }
    if (!addressLine1.trim()) {
      setError('\uc8fc\uc18c\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.')
      return
    }

    const mergedLine2 = [city.trim(), addressLine2.trim()].filter(Boolean).join(' ')
    const buyerAddr = [addressLine1.trim(), mergedLine2].filter(Boolean).join(' ')

    if (totalAmount < 1) {
      setError('\uacb0\uc81c \uae08\uc561\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.')
      return
    }

    if (!initPortOnePayment()) {
      setError('\uacb0\uc81c \ubaa8\ub4c8\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc0c8\ub85c\uace0\uce68\ud574 \uc8fc\uc138\uc694.')
      return
    }

    setSubmitting(true)
    setError('')

    const merchantUid = createMerchantUid()

    try {
      // 1) ??? ??? ? ?? ? imp_uid ??
      const payResult = await requestPortOnePayment({
        paymentMethod,
        merchantUid,
        name: buildPaymentOrderName(items),
        amount: totalAmount,
        buyer_name: name,
        buyer_tel: phone.trim(),
        buyer_email: email.trim() || undefined,
        buyer_addr: buyerAddr || undefined,
        buyer_postcode: postalCode.trim(),
      })

      const impUid =
        typeof payResult?.imp_uid === 'string' ? payResult.imp_uid.trim() : ''
      if (!impUid) {
        navigate('/checkout/complete', {
          replace: true,
          state: {
            status: 'failed',
            message:
              '결제는 완료됐으나 imp_uid를 받지 못했습니다. 잠시 후 다시 시도해 주세요.',
          },
        })
        return
      }

      // 2) 포트원 결제 확인 후 `POST /api/orders/me` + imp_uid
      const order = await createMyOrder(
        {
          shipping: {
            recipientName: name,
            phone: phone.trim(),
            postalCode: postalCode.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2: mergedLine2,
            deliveryMemo: deliveryMemo.trim(),
          },
          payment: {
            method: paymentMethod,
            imp_uid: impUid,
            merchant_uid: payResult.merchant_uid || merchantUid,
          },
          shippingFee: 0,
        },
        token
      )
      // 주문 성공 → `CheckoutCompletePage`(주문 목록 보기는 `/orders` 링크)
      navigate('/checkout/complete', {
        replace: true,
        state: { status: 'success', order },
      })
    } catch (err) {
      if (err instanceof PortOnePaymentError && err.cancelled) {
        setError(err.message)
      } else {
        const msg =
          err instanceof OrderApiError && typeof err.message === 'string'
            ? err.message
            : err instanceof PortOnePaymentError && typeof err.message === 'string'
              ? err.message
              : '\uc8fc\ubb38\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.'
        navigate('/checkout/complete', {
          replace: true,
          state: { status: 'failed', message: msg },
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const items = Array.isArray(cart?.items) ? cart.items : []
  const totalItems = Number(cart?.totalItems) || 0
  const subtotal = Number(cart?.totalAmount) || 0
  const shippingFee = 0
  const totalAmount = subtotal + shippingFee

  return (
    <div className="checkout-page">
      <HomeNav />

      <main className="checkout-page__main">
        <div className="checkout-page__top">
          <Link to="/cart" className="checkout-page__back" aria-label={'\uc7a5\ubc14\uad6c\ub2c8\ub85c \ub3cc\uc544\uac00\uae30'}>
            <IconBack />
          </Link>
          <h1 className="checkout-page__title">{'\uacb0\uc81c'}</h1>
        </div>

        <nav className="checkout-page__steps" aria-label={'\uacb0\uc81c \ub2e8\uacc4'}>
          {STEPS.map((step) => (
            <div
              key={step.key}
              className={`checkout-page__step${
                step.id === 1 ? ' checkout-page__step--done' : ''
              }${step.id === 2 ? ' checkout-page__step--active' : ''}`}
            >
              <span className="checkout-page__step-badge">{step.id}</span>
              <span className="checkout-page__step-label">{step.label}</span>
            </div>
          ))}
        </nav>

        {!isLoggedIn ? (
          <div className="checkout-page__panel">
            <p>
              {'\ub85c\uadf8\uc778 \ud6c4 \uacb0\uc81c\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'}{' '}
              <Link to="/login">{'\ub85c\uadf8\uc778'}</Link>
            </p>
          </div>
        ) : loading ? (
          <p className="checkout-page__status" role="status">{'\ubd88\ub7ec\uc624\ub294 \uc911\u2026'}</p>
        ) : items.length === 0 ? (
          <div className="checkout-page__panel">
            <p>{'\uc7a5\ubc14\uad6c\ub2c8\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.'}</p>
            <Link to="/">{'\uc1fc\ud551 \uacc4\uc18d\ud558\uae30'}</Link>
          </div>
        ) : (
          <div className="checkout-page__layout">
            <form
              id="checkout-form"
              className="checkout-page__col-main"
              onSubmit={handlePlaceOrder}
              noValidate
            >
              {error ? (
                <p className="checkout-page__error" role="alert">
                  {error}
                </p>
              ) : null}

              <section className="checkout-page__card" aria-labelledby="checkout-shipping-title">
                <div className="checkout-page__card-head">
                  <span className="checkout-page__card-icon" aria-hidden>
                    <IconTruck />
                  </span>
                  <h2 id="checkout-shipping-title">{'\ubc30\uc1a1 \uc815\ubcf4'}</h2>
                </div>

                <div className="checkout-page__form">
                <div className="checkout-page__field">
                  <label htmlFor="checkout-name">{'\uc774\ub984'}</label>
                  <div className="checkout-page__input-wrap checkout-page__input-wrap--plain">
                    <input
                      id="checkout-name"
                      name="recipientName"
                      type="text"
                      autoComplete="name"
                      placeholder={'\uc774\ub984'}
                      value={recipientName}
                      onChange={(ev) => setRecipientName(ev.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="checkout-page__field">
                  <label htmlFor="checkout-email">{'\uc774\uba54\uc77c'}</label>
                  <div className="checkout-page__input-wrap">
                    <IconMail />
                    <input
                      id="checkout-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                    />
                  </div>
                </div>

                <div className="checkout-page__field">
                  <label htmlFor="checkout-phone">{'\uc804\ud654\ubc88\ud638'}</label>
                  <div className="checkout-page__input-wrap">
                    <IconPhone />
                    <input
                      id="checkout-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="010-0000-0000"
                      value={phone}
                      onChange={(ev) => setPhone(ev.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="checkout-page__field">
                  <label htmlFor="checkout-address">{'\uc8fc\uc18c'}</label>
                  <div className="checkout-page__input-wrap">
                    <IconPin />
                    <input
                      id="checkout-address"
                      name="addressLine1"
                      type="text"
                      autoComplete="street-address"
                      placeholder={'\ub3c4\ub85c\uba85\u00b7\uc9c0\ubc88 \uc8fc\uc18c'}
                      value={addressLine1}
                      onChange={(ev) => setAddressLine1(ev.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="checkout-page__row checkout-page__row--2">
                  <div className="checkout-page__field">
                    <label htmlFor="checkout-city">{'\uc2dc\u00b7\uad70\u00b7\uad6c'}</label>
                    <div className="checkout-page__input-wrap checkout-page__input-wrap--plain">
                      <input
                        id="checkout-city"
                        name="city"
                        type="text"
                        autoComplete="address-level2"
                        placeholder={'\uc11c\uc6b8 \uac15\ub0a8\uad6c'}
                        value={city}
                        onChange={(ev) => setCity(ev.target.value)}
                      />
                    </div>
                  </div>
                  <div className="checkout-page__field">
                    <label htmlFor="checkout-zip">{'\uc6b0\ud3b8\ubc88\ud638'}</label>
                    <div className="checkout-page__input-wrap checkout-page__input-wrap--plain">
                      <input
                        id="checkout-zip"
                        name="postalCode"
                        type="text"
                        autoComplete="postal-code"
                        placeholder="06236"
                        value={postalCode}
                        onChange={(ev) => setPostalCode(ev.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="checkout-page__field">
                  <label htmlFor="checkout-detail">{'\uc0c1\uc138 \uc8fc\uc18c'}</label>
                  <div className="checkout-page__input-wrap checkout-page__input-wrap--plain">
                    <input
                      id="checkout-detail"
                      name="addressLine2"
                      type="text"
                      autoComplete="address-line2"
                      placeholder={'\ub3d9\u00b7\ud638\uc218 (\uc120\ud0dd)'}
                      value={addressLine2}
                      onChange={(ev) => setAddressLine2(ev.target.value)}
                    />
                  </div>
                </div>

                <div className="checkout-page__field">
                  <label htmlFor="checkout-memo">{'\ubc30\uc1a1 \uba54\ubaa8 (\uc120\ud0dd)'}</label>
                  <div className="checkout-page__input-wrap checkout-page__input-wrap--plain">
                    <input
                      id="checkout-memo"
                      name="deliveryMemo"
                      type="text"
                      placeholder={'\ubb38 \uc55e\uc5d0 \ub193\uc544 \uc8fc\uc138\uc694'}
                      value={deliveryMemo}
                      onChange={(ev) => setDeliveryMemo(ev.target.value)}
                    />
                  </div>
                </div>
                </div>
              </section>

              <section className="checkout-page__card" aria-labelledby="checkout-payment-title">
                <div className="checkout-page__card-head">
                  <span
                    className="checkout-page__card-icon checkout-page__card-icon--payment"
                    aria-hidden
                  >
                    <IconCard />
                  </span>
                  <h2 id="checkout-payment-title">{'\uacb0\uc81c \uc815\ubcf4'}</h2>
                </div>

                <fieldset className="checkout-page__payment-options">
                  <legend className="visually-hidden">{'\uacb0\uc81c \uc218\ub2e8'}</legend>
                  {PAYMENT_OPTIONS.map((opt) => {
                    const selected = paymentMethod === opt.id
                    return (
                      <label
                        key={opt.id}
                        className={`checkout-page__payment-option${
                          selected ? ' checkout-page__payment-option--selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={opt.id}
                          checked={selected}
                          onChange={() => setPaymentMethod(opt.id)}
                        />
                        <span className="checkout-page__payment-option-label">{opt.label}</span>
                      </label>
                    )
                  })}
                </fieldset>
              </section>
            </form>

            <aside className="checkout-page__summary" aria-label={'\uc8fc\ubb38 \uc694\uc57d'}>
              <h2 className="checkout-page__summary-title">{'\uc8fc\ubb38 \uc694\uc57d'}</h2>

              <ul className="checkout-page__items">
                {items.map((line) => {
                  const product = getLineProduct(line)
                  const lineId = line.id || line._id
                  const qty = Number(line.quantity) || 1
                  const unitPrice = Number(line.unitPrice) || Number(product.price) || 0
                  const meta = [product.category, product.sku].filter(Boolean).join(' \u00b7 ')

                  return (
                    <li key={lineId} className="checkout-page__item">
                      <div className="checkout-page__item-thumb">
                        {product.image ? (
                          <img src={product.image} alt="" />
                        ) : (
                          <span>IMG</span>
                        )}
                        <span className="checkout-page__item-qty">{qty}</span>
                      </div>
                      <div className="checkout-page__item-body">
                        <p className="checkout-page__item-name">{product.name}</p>
                        {meta ? <p className="checkout-page__item-meta">{meta}</p> : null}
                      </div>
                      <p className="checkout-page__item-price">{formatWon(unitPrice * qty)}</p>
                    </li>
                  )
                })}
              </ul>

              <div className="checkout-page__totals">
                <div className="checkout-page__totals-row">
                  <span>
                    {'\uc18c\uacc4'} ({totalItems}
                    {'\uac1c'})
                  </span>
                  <span>{formatWon(subtotal)}</span>
                </div>
                <div className="checkout-page__totals-row checkout-page__totals-row--free">
                  <span>{'\ubc30\uc1a1\ube44'}</span>
                  <span>{'\ubb34\ub8cc'}</span>
                </div>
              </div>

              <div className="checkout-page__grand">
                <span>{'\ucd1d \uacb0\uc81c\uae08\uc561'}</span>
                <strong>{formatWon(totalAmount)}</strong>
              </div>

              <button
                type="submit"
                form="checkout-form"
                className="checkout-page__submit"
                disabled={submitting}
              >
                <IconLock />
                {submitting ? '\ucc98\ub9ac \uc911\u2026' : '\uc8fc\ubb38\ud558\uae30'}
              </button>

              <p className="checkout-page__secure">
                <IconLock />
                {'SSL \ubcf4\uc548 \uacb0\uc81c'}
              </p>
              <div className="checkout-page__pay-badges" aria-hidden>
                <span className="checkout-page__pay-badge">VISA</span>
                <span className="checkout-page__pay-badge">MC</span>
                <span className="checkout-page__pay-badge">AMEX</span>
                <span className="checkout-page__pay-badge">PAYPAL</span>
              </div>
              <p className="checkout-page__legal">
                {
                  '\uc8fc\ubb38\uc744 \uc644\ub8cc\ud558\uba74 \uc774\uc6a9\uc57d\uad00 \ubc0f \uac1c\uc778\uc815\ubcf4 \ucc98\ub9ac\ubc29\uce68\uc5d0 \ub3d9\uc758\ud55c \uac83\uc73c\ub85c \uac04\uc8fc\ud569\ub2c8\ub2e4.'
                }
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
